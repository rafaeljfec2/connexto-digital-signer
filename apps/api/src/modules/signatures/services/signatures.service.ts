import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { DocumentsService } from '../../documents/services/documents.service';
import { DocumentStatus, SigningMode } from '../../documents/entities/document.entity';
import {
  EVENT_SIGNATURE_COMPLETED,
  EVENT_DOCUMENT_SENT,
} from '@connexto/events';
import type {
  SignatureCompletedEvent,
  DocumentSentEvent,
} from '@connexto/events';
import { randomBytes } from 'crypto';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { SignatureFieldsService } from './signature-fields.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

export interface SigningContext {
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly documentsService: DocumentsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfService: PdfService,
    private readonly fieldsService: SignatureFieldsService,
    private readonly notificationsService: NotificationsService
  ) {}

  async addSigner(
    tenantId: string,
    documentId: string,
    createSignerDto: CreateSignerDto
  ): Promise<Signer> {
    const document = await this.documentsService.findOne(documentId, tenantId);
    const accessToken = randomBytes(32).toString('hex');
    const signer = this.signerRepository.create({
      ...createSignerDto,
      tenantId,
      documentId,
      accessToken,
    });
    const saved = await this.signerRepository.save(signer);
    return saved;
  }

  async findByDocument(documentId: string, tenantId: string): Promise<Signer[]> {
    return this.signerRepository.find({
      where: { documentId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByToken(accessToken: string): Promise<Signer> {
    const signer = await this.signerRepository.findOne({
      where: { accessToken },
    });
    if (signer === null) {
      throw new NotFoundException('Signer or document not found');
    }
    return signer;
  }

  async acceptSignature(
    accessToken: string,
    _dto: { consent: string },
    context: SigningContext
  ): Promise<Signer> {
    const signer = await this.findByToken(accessToken);
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Document already signed by this signer');
    }
    const document = await this.documentsService.findOne(
      signer.documentId,
      signer.tenantId
    );
    if (document.status === DocumentStatus.COMPLETED) {
      throw new BadRequestException('Document is already completed');
    }
    if (
      document.expiresAt !== null &&
      new Date() > document.expiresAt
    ) {
      throw new BadRequestException('Document has expired');
    }
    signer.status = SignerStatus.SIGNED;
    signer.signedAt = new Date();
    signer.ipAddress = context.ipAddress;
    signer.userAgent = context.userAgent;
    const saved = await this.signerRepository.save(signer);
    const payload: SignatureCompletedEvent = {
      documentId: signer.documentId,
      tenantId: signer.tenantId,
      signerId: saved.id,
      signedAt: saved.signedAt ?? new Date(),
    };
    this.eventEmitter.emit(EVENT_SIGNATURE_COMPLETED, payload);
    const allSigned = await this.areAllSignersSigned(signer.documentId, signer.tenantId);
    if (allSigned) {
      await this.finalizeDocument(signer.documentId, signer.tenantId);
    } else if (document.signingMode === SigningMode.SEQUENTIAL) {
      await this.notifyNextSigner(document.id, document.tenantId, document.title);
    }
    return saved;
  }

  async sendDocument(
    tenantId: string,
    documentId: string,
    message?: string
  ): Promise<{ notified: string[] }> {
    const document = await this.documentsService.findOne(documentId, tenantId);
    if (document.status === DocumentStatus.COMPLETED) {
      throw new BadRequestException('Document is already completed');
    }
    if (document.expiresAt !== null && new Date() > document.expiresAt) {
      throw new BadRequestException('Document has expired');
    }
    const signers = await this.findByDocument(documentId, tenantId);
    if (signers.length === 0) {
      throw new BadRequestException('At least one signer is required');
    }
    const fields = await this.fieldsService.findByDocument(tenantId, documentId);
    if (fields.length === 0 || fields.every((field) => field.required === false)) {
      throw new BadRequestException('At least one required field is required');
    }
    if (document.signingMode === SigningMode.SEQUENTIAL) {
      const orders = signers.map((signer) => signer.order).filter((order) => order !== null);
      if (orders.length !== signers.length) {
        throw new BadRequestException('All signers must have an order in sequential mode');
      }
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        throw new BadRequestException('Signer order must be unique');
      }
    }
    const toNotify =
      document.signingMode === SigningMode.SEQUENTIAL
        ? this.pickFirstSigner(signers)
        : signers;
    const now = new Date();
    const notified = await this.notifySigners(document, toNotify, now, message);
    await this.documentsService.setStatus(documentId, tenantId, DocumentStatus.PENDING_SIGNATURES);
    const sentPayload: DocumentSentEvent = {
      documentId,
      tenantId,
      signingMode: document.signingMode,
      sentAt: now,
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_SENT, sentPayload);
    return { notified: notified.map((signer) => signer.id) };
  }

  async previewSend(
    tenantId: string,
    documentId: string,
    message?: string
  ): Promise<{ subject: string; body: string }> {
    const document = await this.documentsService.findOne(documentId, tenantId);
    const signers = await this.findByDocument(documentId, tenantId);
    if (signers.length === 0) {
      throw new BadRequestException('At least one signer is required');
    }
    const target =
      document.signingMode === SigningMode.SEQUENTIAL
        ? this.pickFirstSigner(signers)[0]
        : signers[0];
    if (!target) {
      throw new BadRequestException('At least one signer is required');
    }
    const signUrl = this.buildSignUrl(target.accessToken);
    return this.notificationsService.buildSignatureInvite({
      signerName: target.name,
      documentTitle: document.title,
      signUrl,
      message,
    });
  }

  private pickFirstSigner(signers: Signer[]): Signer[] {
    if (signers.length === 0) return [];
    const sorted = [...signers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return [sorted[0]];
  }

  private buildSignUrl(accessToken: string): string {
    const baseUrl = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
    return `${baseUrl}/sign/${accessToken}`;
  }

  private async notifySigners(
    document: { id: string; tenantId: string; title: string; signingMode: SigningMode },
    signers: Signer[],
    notifiedAt: Date,
    message?: string
  ): Promise<Signer[]> {
    if (signers.length === 0) return [];
    const updated = signers.map((signer) => ({
      ...signer,
      notifiedAt,
    }));
    const saved = await this.signerRepository.save(updated);
    await Promise.all(
      saved.map(async (signer) => {
        await this.notificationsService.sendSignatureInvite({
          tenantId: document.tenantId,
          signerEmail: signer.email,
          signerName: signer.name,
          documentTitle: document.title,
          signUrl: this.buildSignUrl(signer.accessToken),
          message,
        });
      })
    );
    return saved;
  }

  private async notifyNextSigner(
    documentId: string,
    tenantId: string,
    documentTitle: string
  ): Promise<void> {
    const signers = await this.findByDocument(documentId, tenantId);
    const pending = signers
      .filter((signer) => signer.status !== SignerStatus.SIGNED)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const next = pending[0];
    if (!next) return;
    await this.notifySigners(
      { id: documentId, tenantId, title: documentTitle, signingMode: SigningMode.SEQUENTIAL },
      [next],
      new Date()
    );
  }

  private async finalizeDocument(documentId: string, tenantId: string): Promise<void> {
    const document = await this.documentsService.findOne(documentId, tenantId);
    const originalBuffer = await this.documentsService.getOriginalFile(document);
    const signers = await this.findByDocument(documentId, tenantId);
    const evidence = signers.map((s) => ({
      name: s.name,
      email: s.email,
      signedAt: s.signedAt?.toISOString() ?? '',
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    }));
    const finalBuffer = await this.pdfService.appendEvidencePage(
      originalBuffer,
      evidence,
      document.title
    );
    await this.documentsService.setFinalPdf(documentId, tenantId, finalBuffer);
  }

  async areAllSignersSigned(documentId: string, tenantId: string): Promise<boolean> {
    const signers = await this.findByDocument(documentId, tenantId);
    if (signers.length === 0) return false;
    return signers.every((s) => s.status === SignerStatus.SIGNED);
  }
}
