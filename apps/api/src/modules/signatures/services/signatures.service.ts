import type { DocumentSentEvent, SignatureCompletedEvent } from '@connexto/events';
import { EVENT_DOCUMENT_SENT, EVENT_SIGNATURE_COMPLETED } from '@connexto/events';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { DocumentStatus, SigningMode } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { UpdateSignerDto } from '../dto/update-signer.dto';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { SignatureFieldsService } from './signature-fields.service';

export interface SigningContext {
  ipAddress: string;
  userAgent: string;
}

export interface AuditTimelineEvent {
  type: 'sent' | 'signed' | 'completed' | 'verified';
  actorName: string;
  actorEmail: string;
  timestamp: Date;
}

export interface AuditSignerInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  authMethod: string;
  notifiedAt: Date | null;
  signedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  verifiedAt: Date | null;
}

export interface DocumentAuditSummary {
  document: {
    id: string;
    title: string;
    status: string;
    signingMode: string;
    createdAt: Date;
    expiresAt: Date | null;
    completedAt: Date | null;
    originalHash: string | null;
    finalHash: string | null;
  };
  signers: AuditSignerInfo[];
  timeline: AuditTimelineEvent[];
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
    await this.documentsService.findOne(documentId, tenantId);
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

  async updateSigner(
    tenantId: string,
    documentId: string,
    signerId: string,
    dto: UpdateSignerDto
  ): Promise<Signer> {
    const signer = await this.signerRepository.findOne({
      where: { id: signerId, documentId, tenantId },
    });
    if (signer === null) {
      throw new NotFoundException('Signer not found');
    }
    Object.assign(signer, dto);
    return this.signerRepository.save(signer);
  }

  async removeSigner(tenantId: string, documentId: string, signerId: string): Promise<void> {
    const signer = await this.signerRepository.findOne({
      where: { id: signerId, documentId, tenantId },
    });
    if (signer === null) {
      throw new NotFoundException('Signer not found');
    }
    await this.signerRepository.remove(signer);
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

  async findByTokenWithDocument(accessToken: string): Promise<{
    signer: Signer;
    document: { id: string; title: string; status: DocumentStatus; signingLanguage: string };
  }> {
    const signer = await this.findByToken(accessToken);
    const document = await this.documentsService.findOne(signer.documentId, signer.tenantId);
    return {
      signer,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        signingLanguage: document.signingLanguage,
      },
    };
  }

  async getSignerPdf(accessToken: string): Promise<Buffer> {
    const signer = await this.findByToken(accessToken);
    const document = await this.documentsService.findOne(signer.documentId, signer.tenantId);
    return this.documentsService.getOriginalFile(document);
  }

  async getSignerSignedPdf(accessToken: string): Promise<Buffer | null> {
    const signer = await this.findByToken(accessToken);
    const document = await this.documentsService.findOne(signer.documentId, signer.tenantId);
    return this.documentsService.getFinalFile(document);
  }

  async getSignerFields(accessToken: string) {
    const signer = await this.findByToken(accessToken);
    return this.fieldsService.findBySigner(signer.tenantId, signer.documentId, signer.id);
  }

  async acceptSignature(
    accessToken: string,
    dto: { consent: string; fields: { fieldId: string; value: string }[]; signatureData?: string },
    context: SigningContext
  ): Promise<Signer> {
    const signer = await this.findByToken(accessToken);
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Document already signed by this signer');
    }
    if (signer.authMethod === 'email' && signer.verifiedAt === null) {
      throw new BadRequestException('Verification required');
    }
    const document = await this.documentsService.findOne(signer.documentId, signer.tenantId);
    if (document.status === DocumentStatus.COMPLETED) {
      throw new BadRequestException('Document is already completed');
    }
    if (document.expiresAt !== null && new Date() > document.expiresAt) {
      throw new BadRequestException('Document has expired');
    }
    await Promise.all(
      dto.fields.map((field) =>
        this.fieldsService.updateValue(
          signer.tenantId,
          signer.documentId,
          field.fieldId,
          field.value
        )
      )
    );
    signer.status = SignerStatus.SIGNED;
    signer.signedAt = new Date();
    signer.ipAddress = context.ipAddress;
    signer.userAgent = context.userAgent;
    signer.signatureData = dto.signatureData ?? null;
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
      document.signingMode === SigningMode.SEQUENTIAL ? this.pickFirstSigner(signers) : signers;
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
    const locale = document.signingLanguage ?? 'en';
    const signUrl = this.buildSignUrl(target.accessToken, locale);
    return this.notificationsService.buildSignatureInvite({
      signerName: target.name,
      documentTitle: document.title,
      signUrl,
      locale,
      message,
    });
  }

  private pickFirstSigner(signers: Signer[]): Signer[] {
    if (signers.length === 0) return [];
    const sorted = [...signers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return [sorted[0]];
  }

  private buildSignUrl(accessToken: string, locale = 'pt-br'): string {
    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3001';
    return `${baseUrl}/${locale}/sign/${accessToken}`;
  }

  private async notifySigners(
    document: {
      id: string;
      tenantId: string;
      title: string;
      signingMode: SigningMode;
      signingLanguage?: string;
    },
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
          signUrl: this.buildSignUrl(signer.accessToken, document.signingLanguage ?? 'en'),
          locale: document.signingLanguage ?? 'en',
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
    const allFields = await this.fieldsService.findByDocument(tenantId, documentId);
    const withSignatures = await this.pdfService.embedSignatures(
      originalBuffer,
      allFields.map((f) => ({
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        value: f.value,
      }))
    );
    const signers = await this.findByDocument(documentId, tenantId);
    const evidence = signers.map((s) => ({
      name: s.name,
      email: s.email,
      signedAt: s.signedAt?.toISOString() ?? '',
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      signatureData: s.signatureData,
    }));
    const finalBuffer = await this.pdfService.appendEvidencePage(
      withSignatures,
      evidence,
      document.title,
      document.signingLanguage ?? 'en',
    );
    await this.documentsService.setFinalPdf(documentId, tenantId, finalBuffer);
  }

  async getDocumentAuditSummary(
    documentId: string,
    tenantId: string
  ): Promise<DocumentAuditSummary> {
    const document = await this.documentsService.findOne(documentId, tenantId);
    const signers = await this.findByDocument(documentId, tenantId);

    const timeline: AuditTimelineEvent[] = [];

    for (const signer of signers) {
      if (signer.notifiedAt) {
        timeline.push({
          type: 'sent',
          actorName: signer.name,
          actorEmail: signer.email,
          timestamp: signer.notifiedAt,
        });
      }
      if (signer.verifiedAt) {
        timeline.push({
          type: 'verified',
          actorName: signer.name,
          actorEmail: signer.email,
          timestamp: signer.verifiedAt,
        });
      }
      if (signer.signedAt) {
        timeline.push({
          type: 'signed',
          actorName: signer.name,
          actorEmail: signer.email,
          timestamp: signer.signedAt,
        });
      }
    }

    if (document.status === DocumentStatus.COMPLETED) {
      timeline.push({
        type: 'completed',
        actorName: document.title,
        actorEmail: '',
        timestamp: document.updatedAt,
      });
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const completedAt = document.status === DocumentStatus.COMPLETED ? document.updatedAt : null;

    return {
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        signingMode: document.signingMode,
        createdAt: document.createdAt,
        expiresAt: document.expiresAt,
        completedAt,
        originalHash: document.originalHash,
        finalHash: document.finalHash,
      },
      signers: signers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        authMethod: s.authMethod,
        notifiedAt: s.notifiedAt,
        signedAt: s.signedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        verifiedAt: s.verifiedAt,
      })),
      timeline,
    };
  }

  async getDocumentAuditSummaryByToken(accessToken: string): Promise<DocumentAuditSummary> {
    const signer = await this.findByToken(accessToken);
    return this.getDocumentAuditSummary(signer.documentId, signer.tenantId);
  }

  async areAllSignersSigned(documentId: string, tenantId: string): Promise<boolean> {
    const signers = await this.findByDocument(documentId, tenantId);
    if (signers.length === 0) return false;
    return signers.every((s) => s.status === SignerStatus.SIGNED);
  }
}
