import type { DocumentSentEvent } from '@connexto/events';
import { EVENT_DOCUMENT_SENT } from '@connexto/events';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import type { Envelope } from '../../envelopes/entities/envelope.entity';
import { EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CertificateService } from '../../tenants/services/certificate.service';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { validateEnvelopeIsActionable } from '../utils/validate-envelope-actionable';
import { SignatureFieldsService } from './signature-fields.service';
import { SignaturesService } from './signatures.service';

@Injectable()
export class EnvelopeDispatchService {
  private readonly logger = new Logger(EnvelopeDispatchService.name);

  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly signaturesService: SignaturesService,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfService: PdfService,
    private readonly fieldsService: SignatureFieldsService,
    private readonly notificationsService: NotificationsService,
    private readonly certificateService: CertificateService,
  ) {}

  async sendEnvelope(
    tenantId: string,
    envelopeId: string,
    message?: string,
  ): Promise<{ notified: string[] }> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    validateEnvelopeIsActionable(envelope);

    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    if (documents.length === 0) {
      throw new BadRequestException('At least one document is required in the envelope');
    }

    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);
    if (signers.length === 0) {
      throw new BadRequestException('At least one signer is required');
    }

    if (envelope.signingMode === SigningMode.SEQUENTIAL) {
      this.validateSequentialOrders(signers);
    }

    const toNotify =
      envelope.signingMode === SigningMode.SEQUENTIAL
        ? this.pickFirstSigner(signers)
        : signers;
    const now = new Date();
    const notified = await this.notifySigners(envelope, toNotify, now, message);

    await Promise.all(
      documents.map((d) =>
        this.documentsService.setStatus(d.id, tenantId, DocumentStatus.PENDING_SIGNATURES),
      ),
    );
    await this.envelopesService.setStatus(envelopeId, tenantId, EnvelopeStatus.PENDING_SIGNATURES);

    const sentPayload: DocumentSentEvent = {
      documentId: envelopeId,
      tenantId,
      signingMode: envelope.signingMode,
      sentAt: now,
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_SENT, sentPayload);

    return { notified: notified.map((signer) => signer.id) };
  }

  async previewSend(
    tenantId: string,
    envelopeId: string,
    message?: string,
  ): Promise<{ subject: string; body: string }> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);
    if (signers.length === 0) {
      throw new BadRequestException('At least one signer is required');
    }
    const target =
      envelope.signingMode === SigningMode.SEQUENTIAL
        ? this.pickFirstSigner(signers)[0]
        : signers[0];
    if (!target) {
      throw new BadRequestException('At least one signer is required');
    }
    const locale = envelope.signingLanguage ?? 'en';
    const signUrl = this.buildSignUrl(target.accessToken, locale);
    return this.notificationsService.buildSignatureInvite({
      signerName: target.name,
      documentTitle: envelope.title,
      signUrl,
      locale,
      message,
    });
  }

  async areAllSignersSigned(envelopeId: string, tenantId: string): Promise<boolean> {
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);
    if (signers.length === 0) return false;
    return signers.every((s) => s.status === SignerStatus.SIGNED);
  }

  async notifyNextSigner(envelope: Envelope, tenantId: string): Promise<void> {
    const signers = await this.signaturesService.findByEnvelope(envelope.id, tenantId);
    const pending = signers
      .filter((signer) => signer.status !== SignerStatus.SIGNED)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const next = pending[0];
    if (!next) return;
    await this.notifySigners(
      {
        id: envelope.id,
        tenantId,
        title: envelope.title,
        signingMode: SigningMode.SEQUENTIAL,
        signingLanguage: envelope.signingLanguage,
      },
      [next],
      new Date(),
    );
  }

  async finalizeEnvelope(envelopeId: string, tenantId: string): Promise<void> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);

    const evidence = signers.map((s) => ({
      name: s.name,
      email: s.email,
      cpf: s.cpf,
      role: s.role ?? 'signer',
      signedAt: s.signedAt?.toISOString() ?? '',
      notifiedAt: s.notifiedAt?.toISOString() ?? null,
      verifiedAt: s.verifiedAt?.toISOString() ?? null,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      signatureData: s.signatureData,
    }));

    const certificateStatus = await this.certificateService.getCertificateStatus(tenantId);

    for (const document of documents) {
      await this.finalizeDocument(
        document.id,
        tenantId,
        envelope,
        evidence,
        certificateStatus,
      );
    }

    await this.envelopesService.setStatus(envelopeId, tenantId, EnvelopeStatus.COMPLETED);
  }

  private validateSequentialOrders(signers: Signer[]): void {
    const orders = signers.map((signer) => signer.order).filter((order) => order !== null);
    if (orders.length !== signers.length) {
      throw new BadRequestException('All signers must have an order in sequential mode');
    }
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Signer order must be unique');
    }
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
    envelope: {
      readonly id: string;
      readonly tenantId: string;
      readonly title: string;
      readonly signingMode: SigningMode;
      readonly signingLanguage?: string;
    },
    signers: Signer[],
    notifiedAt: Date,
    message?: string,
  ): Promise<Signer[]> {
    if (signers.length === 0) return [];
    const updated = signers.map((signer) => ({
      ...signer,
      notifiedAt,
    }));
    const saved = await this.signerRepository.save(updated);
    await Promise.all(
      saved.map((signer) =>
        this.notificationsService.sendSignatureInvite({
          tenantId: envelope.tenantId,
          signerEmail: signer.email,
          signerName: signer.name,
          documentTitle: envelope.title,
          signUrl: this.buildSignUrl(signer.accessToken, envelope.signingLanguage ?? 'en'),
          locale: envelope.signingLanguage ?? 'en',
          message,
        }),
      ),
    );
    return saved;
  }

  private async finalizeDocument(
    documentId: string,
    tenantId: string,
    envelope: Envelope,
    evidence: Array<{
      readonly name: string;
      readonly email: string;
      readonly cpf: string | null;
      readonly role: string;
      readonly signedAt: string;
      readonly notifiedAt: string | null;
      readonly verifiedAt: string | null;
      readonly ipAddress: string | null;
      readonly userAgent: string | null;
      readonly signatureData: string | null;
    }>,
    certificateStatus: Awaited<ReturnType<CertificateService['getCertificateStatus']>>,
  ): Promise<void> {
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
      })),
    );

    const originalHash = document.originalHash ?? this.pdfService.computeHash(originalBuffer);
    const signedHash = this.pdfService.computeHash(withSignatures);

    let finalBuffer = await this.pdfService.appendEvidencePage(
      withSignatures,
      evidence,
      document.title,
      envelope.signingLanguage ?? 'en',
      {
        documentId: document.id,
        originalHash,
        signedHash,
        timezone: 'GMT -03:00 Brasilia',
        version: 'v1.0.0',
        certificate: certificateStatus
          ? {
              subject: certificateStatus.subject,
              issuer: certificateStatus.issuer,
            }
          : undefined,
      },
    );

    let p7sBuffer: Buffer | null = null;
    if (certificateStatus && !certificateStatus.isExpired) {
      try {
        finalBuffer = await this.certificateService.signPdf(tenantId, finalBuffer);
        p7sBuffer = await this.certificateService.generateP7s(tenantId, finalBuffer);
        this.logger.log(`Document ${documentId} digitally signed with tenant certificate`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Digital signature failed for document ${documentId}: ${message}`);
      }
    }

    await this.documentsService.setFinalPdf(documentId, tenantId, finalBuffer, p7sBuffer);
  }
}
