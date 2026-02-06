import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { DocumentsService } from '../../documents/services/documents.service';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { EVENT_SIGNATURE_COMPLETED, EVENT_SIGNER_ADDED } from '@connexto/events';
import type { SignatureCompletedEvent, SignerAddedEvent } from '@connexto/events';
import { randomBytes } from 'crypto';
import { PdfService } from '../../../shared/pdf/pdf.service';

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
    private readonly pdfService: PdfService
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
    const payload: SignerAddedEvent = {
      documentId,
      documentTitle: document.title,
      tenantId,
      signerId: saved.id,
      signerEmail: saved.email,
      signerName: saved.name,
      accessToken,
    };
    this.eventEmitter.emit(EVENT_SIGNER_ADDED, payload);
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
    }
    return saved;
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
