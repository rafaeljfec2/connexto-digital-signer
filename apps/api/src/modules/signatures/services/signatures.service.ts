import type { DocumentSentEvent, SignatureCompletedEvent } from '@connexto/events';
import { EVENT_DOCUMENT_SENT, EVENT_SIGNATURE_COMPLETED } from '@connexto/events';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import type { Envelope } from '../../envelopes/entities/envelope.entity';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CertificateService } from '../../tenants/services/certificate.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { IdentifySignerDto } from '../dto/identify-signer.dto';
import { ListSignersQueryDto } from '../dto/list-signers-query.dto';
import { UpdateSignerDto } from '../dto/update-signer.dto';
import { Signer, SignerStatus } from '../entities/signer.entity';
import type {
  AuditTimelineEvent,
  DocumentAuditSummary,
  SigningContext,
} from '../interfaces/audit.interface';
import type { SignerPendingDocument } from '../interfaces/signer-document.interface';
import { SignatureFieldsService } from './signature-fields.service';
import { TenantSignerService } from './tenant-signer.service';

export type { AuditTimelineEvent, DocumentAuditSummary, SigningContext } from '../interfaces/audit.interface';
export type { AuditSignerInfo } from '../interfaces/audit.interface';

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);

  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfService: PdfService,
    private readonly fieldsService: SignatureFieldsService,
    private readonly notificationsService: NotificationsService,
    private readonly certificateService: CertificateService,
    private readonly tenantSignerService: TenantSignerService,
  ) {}

  async addSigner(
    tenantId: string,
    envelopeId: string,
    createSignerDto: CreateSignerDto
  ): Promise<Signer> {
    await this.envelopesService.findOne(envelopeId, tenantId);

    const tenantSigner = await this.tenantSignerService.findOrCreate(
      tenantId,
      {
        name: createSignerDto.name,
        email: createSignerDto.email,
        cpf: createSignerDto.cpf,
        phone: createSignerDto.phone,
        birthDate: createSignerDto.birthDate,
      },
    );

    const accessToken = randomBytes(32).toString('hex');
    const signer = this.signerRepository.create({
      ...createSignerDto,
      tenantId,
      envelopeId,
      tenantSignerId: tenantSigner.id,
      accessToken,
    });
    return this.signerRepository.save(signer);
  }

  async updateSigner(
    tenantId: string,
    envelopeId: string,
    signerId: string,
    dto: UpdateSignerDto
  ): Promise<Signer> {
    const signer = await this.findSignerOrFail({ id: signerId, envelopeId, tenantId });
    Object.assign(signer, dto);
    return this.signerRepository.save(signer);
  }

  async removeSigner(tenantId: string, envelopeId: string, signerId: string): Promise<void> {
    const signer = await this.findSignerOrFail({ id: signerId, envelopeId, tenantId });
    await this.signerRepository.remove(signer);
  }

  async findByEnvelope(envelopeId: string, tenantId: string): Promise<Signer[]> {
    return this.signerRepository.find({
      where: { envelopeId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async getEnvelopeTracking(envelopeId: string, tenantId: string) {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const signers = await this.findByEnvelope(envelopeId, tenantId);

    return {
      envelope: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        signingMode: envelope.signingMode,
        createdAt: envelope.createdAt,
        expiresAt: envelope.expiresAt,
      },
      signers: signers.map((signer) => ({
        id: signer.id,
        name: signer.name,
        email: signer.email,
        order: signer.order,
        status: signer.status,
        steps: [
          {
            key: 'notified' as const,
            completedAt: signer.notifiedAt,
            reminderCount: signer.reminderCount,
          },
          {
            key: 'viewed' as const,
            completedAt: signer.viewedAt,
          },
          {
            key: 'verified' as const,
            completedAt: signer.verifiedAt,
          },
          {
            key: 'signed' as const,
            completedAt: signer.signedAt,
          },
        ],
      })),
    };
  }

  async searchPendingDocuments(
    tenantId: string,
    query: string,
  ): Promise<SignerPendingDocument[]> {
    return this.signerRepository
      .createQueryBuilder('signer')
      .innerJoin('envelopes', 'envelope', 'envelope.id = signer.envelope_id')
      .select([
        'signer.id AS "signerId"',
        'signer.name AS "signerName"',
        'signer.email AS "signerEmail"',
        'signer.cpf AS "signerCpf"',
        'signer.phone AS "signerPhone"',
        'signer.status AS "signerStatus"',
        'signer.access_token AS "accessToken"',
        'envelope.id AS "envelopeId"',
        'envelope.title AS "envelopeTitle"',
        'envelope.created_at AS "envelopeCreatedAt"',
        'envelope.expires_at AS "envelopeExpiresAt"',
      ])
      .where('signer.tenant_id = :tenantId', { tenantId })
      .andWhere('signer.status = :signerStatus', { signerStatus: SignerStatus.PENDING })
      .andWhere('envelope.status = :envelopeStatus', {
        envelopeStatus: EnvelopeStatus.PENDING_SIGNATURES,
      })
      .andWhere(
        '(signer.email ILIKE :q OR signer.cpf ILIKE :q OR signer.phone ILIKE :q)',
        { q: `%${query}%` },
      )
      .orderBy('envelope.created_at', 'DESC')
      .limit(50)
      .getRawMany();
  }

  async findByTenant(
    tenantId: string,
    query: ListSignersQueryDto,
  ): Promise<{
    data: Array<Signer & { envelopeTitle: string }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Signer> = { tenantId };
    if (query.status) {
      where.status = query.status;
    }

    const [signers, total] = await this.signerRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const envelopeIds = [...new Set(signers.map((s) => s.envelopeId))];
    const envelopeMap = new Map<string, string>();

    for (const envId of envelopeIds) {
      try {
        const env = await this.envelopesService.findOne(envId, tenantId);
        envelopeMap.set(env.id, env.title);
      } catch {
        envelopeMap.set(envId, '');
      }
    }

    const data = signers.map((signer) => ({
      ...signer,
      envelopeTitle: envelopeMap.get(signer.envelopeId) ?? '',
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByToken(accessToken: string): Promise<Signer> {
    return this.findSignerOrFail({ accessToken }, 'Signer or document not found');
  }

  async findByTokenWithEnvelope(accessToken: string): Promise<{
    signer: Signer;
    envelope: {
      id: string;
      title: string;
      status: EnvelopeStatus;
      signingLanguage: string;
      expiresAt: Date | null;
    };
    documents: Array<{ id: string; title: string; status: DocumentStatus; position: number }>;
  }> {
    const signer = await this.findByToken(accessToken);

    if (signer.viewedAt === null) {
      signer.viewedAt = new Date();
      await this.signerRepository.save(signer);
    }

    const envelope = await this.envelopesService.findOne(signer.envelopeId, signer.tenantId);
    const documents = await this.documentsService.findByEnvelope(envelope.id, signer.tenantId);

    return {
      signer,
      envelope: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        signingLanguage: envelope.signingLanguage,
        expiresAt: envelope.expiresAt,
      },
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        position: d.position,
      })),
    };
  }

  async identifySigner(
    accessToken: string,
    dto: IdentifySignerDto,
  ): Promise<{ identified: true }> {
    const signer = await this.findByToken(accessToken);

    if (signer.requestEmail) {
      this.validateEmailField(dto.email, signer.email);
    }

    if (signer.requestCpf) {
      this.validateIdentityField(dto.cpf, signer.cpf, 'CPF');
      signer.cpf = signer.cpf ?? (dto.cpf as string);
    }

    if (signer.requestPhone) {
      this.validateIdentityField(dto.phone, signer.phone, 'Phone');
      signer.phone = signer.phone ?? (dto.phone as string);
    }

    await this.signerRepository.save(signer);
    return { identified: true };
  }

  private validateEmailField(
    inputValue: string | undefined,
    storedValue: string,
  ): void {
    if (!inputValue) {
      throw new BadRequestException('Email is required for this signer');
    }
    if (inputValue.toLowerCase() !== storedValue.toLowerCase()) {
      throw new BadRequestException('Email does not match');
    }
  }

  private validateIdentityField(
    inputValue: string | undefined,
    storedValue: string | null,
    fieldName: string,
  ): void {
    if (!inputValue) {
      throw new BadRequestException(`${fieldName} is required for this signer`);
    }
    const normalizedInput = inputValue.replaceAll(/\D/g, '');
    if (storedValue) {
      const normalizedStored = storedValue.replaceAll(/\D/g, '');
      if (normalizedInput !== normalizedStored) {
        throw new BadRequestException(`${fieldName} does not match`);
      }
    }
  }

  async getSignerPdf(accessToken: string, documentId?: string): Promise<Buffer> {
    const signer = await this.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(signer.envelopeId, signer.tenantId);

    const target = documentId
      ? documents.find((d) => d.id === documentId)
      : documents[0];

    if (!target) {
      throw new NotFoundException('Document not found in this envelope');
    }

    return this.documentsService.getOriginalFile(target);
  }

  async getSignerPdfUrl(
    accessToken: string,
    documentId?: string,
  ): Promise<{ url: string; mimeType: string | null; expiresIn: number }> {
    const signer = await this.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(signer.envelopeId, signer.tenantId);

    const target = documentId
      ? documents.find((d) => d.id === documentId)
      : documents[0];

    if (!target) {
      throw new NotFoundException('Document not found in this envelope');
    }

    return this.documentsService.getOriginalFileUrl(target);
  }

  async getSignerSignedPdf(accessToken: string, documentId?: string): Promise<Buffer | null> {
    const signer = await this.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(signer.envelopeId, signer.tenantId);

    const target = documentId
      ? documents.find((d) => d.id === documentId)
      : documents[0];

    if (!target) {
      throw new NotFoundException('Document not found in this envelope');
    }

    return this.documentsService.getFinalFile(target);
  }

  async getSignerSignedPdfUrl(
    accessToken: string,
    documentId?: string,
  ): Promise<{ url: string; expiresIn: number } | null> {
    const signer = await this.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(signer.envelopeId, signer.tenantId);

    const target = documentId
      ? documents.find((d) => d.id === documentId)
      : documents[0];

    if (!target) {
      throw new NotFoundException('Document not found in this envelope');
    }

    return this.documentsService.getFinalFileUrl(target);
  }

  async getSignerFields(accessToken: string, documentId?: string) {
    const signer = await this.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(signer.envelopeId, signer.tenantId);

    if (documentId) {
      const target = documents.find((d) => d.id === documentId);
      if (!target) throw new NotFoundException('Document not found in this envelope');
      return this.fieldsService.findBySigner(signer.tenantId, target.id, signer.id);
    }

    const allFields = await Promise.all(
      documents.map((d) => this.fieldsService.findBySigner(signer.tenantId, d.id, signer.id)),
    );
    return allFields.flat();
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

    const envelope = await this.envelopesService.findOne(signer.envelopeId, signer.tenantId);
    this.validateEnvelopeIsActionable(envelope);

    await Promise.all(
      dto.fields.map((field) =>
        this.fieldsService.updateValueByFieldId(
          signer.tenantId,
          field.fieldId,
          field.value,
        ),
      ),
    );

    signer.status = SignerStatus.SIGNED;
    signer.signedAt = new Date();
    signer.ipAddress = context.ipAddress;
    signer.userAgent = context.userAgent;
    signer.latitude = context.latitude ?? null;
    signer.longitude = context.longitude ?? null;
    signer.signatureData = dto.signatureData ?? null;
    const saved = await this.signerRepository.save(signer);

    const payload: SignatureCompletedEvent = {
      documentId: envelope.id,
      tenantId: signer.tenantId,
      signerId: saved.id,
      signedAt: saved.signedAt ?? new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      latitude: context.latitude,
      longitude: context.longitude,
    };
    this.eventEmitter.emit(EVENT_SIGNATURE_COMPLETED, payload);

    const allSigned = await this.areAllSignersSigned(envelope.id, signer.tenantId);
    if (allSigned) {
      await this.finalizeEnvelope(envelope.id, signer.tenantId);
    } else if (envelope.signingMode === SigningMode.SEQUENTIAL) {
      await this.notifyNextSigner(envelope, signer.tenantId);
    }

    return saved;
  }

  async sendEnvelope(
    tenantId: string,
    envelopeId: string,
    message?: string
  ): Promise<{ notified: string[] }> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    this.validateEnvelopeIsActionable(envelope);

    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    if (documents.length === 0) {
      throw new BadRequestException('At least one document is required in the envelope');
    }

    const signers = await this.findByEnvelope(envelopeId, tenantId);
    if (signers.length === 0) {
      throw new BadRequestException('At least one signer is required');
    }

    if (envelope.signingMode === SigningMode.SEQUENTIAL) {
      this.validateSequentialOrders(signers);
    }

    const toNotify =
      envelope.signingMode === SigningMode.SEQUENTIAL ? this.pickFirstSigner(signers) : signers;
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
    message?: string
  ): Promise<{ subject: string; body: string }> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const signers = await this.findByEnvelope(envelopeId, tenantId);
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

  async getEnvelopeAuditSummary(
    envelopeId: string,
    tenantId: string
  ): Promise<DocumentAuditSummary> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const signers = await this.findByEnvelope(envelopeId, tenantId);
    const timeline = this.buildAuditTimeline(signers, envelope);
    const completedAt = envelope.status === EnvelopeStatus.COMPLETED ? envelope.updatedAt : null;

    return {
      document: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        signingMode: envelope.signingMode,
        createdAt: envelope.createdAt,
        expiresAt: envelope.expiresAt,
        completedAt,
        originalHash: null,
        finalHash: null,
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
        latitude: s.latitude,
        longitude: s.longitude,
        verifiedAt: s.verifiedAt,
        signatureData: s.signatureData,
      })),
      timeline,
    };
  }

  async getEnvelopeAuditSummaryByToken(accessToken: string): Promise<DocumentAuditSummary> {
    const signer = await this.findByToken(accessToken);
    return this.getEnvelopeAuditSummary(signer.envelopeId, signer.tenantId);
  }

  async areAllSignersSigned(envelopeId: string, tenantId: string): Promise<boolean> {
    const signers = await this.findByEnvelope(envelopeId, tenantId);
    if (signers.length === 0) return false;
    return signers.every((s) => s.status === SignerStatus.SIGNED);
  }

  private async findSignerOrFail(
    where: FindOptionsWhere<Signer>,
    message = 'Signer not found',
  ): Promise<Signer> {
    const signer = await this.signerRepository.findOne({ where });
    if (signer === null) {
      throw new NotFoundException(message);
    }
    return signer;
  }

  private validateEnvelopeIsActionable(envelope: {
    status: EnvelopeStatus;
    expiresAt: Date | null;
  }): void {
    if (envelope.status === EnvelopeStatus.COMPLETED) {
      throw new BadRequestException('Envelope is already completed');
    }
    if (envelope.expiresAt !== null && new Date() > envelope.expiresAt) {
      throw new BadRequestException('Envelope has expired');
    }
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
      saved.map((signer) =>
        this.notificationsService.sendSignatureInvite({
          tenantId: envelope.tenantId,
          signerEmail: signer.email,
          signerName: signer.name,
          documentTitle: envelope.title,
          signUrl: this.buildSignUrl(signer.accessToken, envelope.signingLanguage ?? 'en'),
          locale: envelope.signingLanguage ?? 'en',
          message,
        })
      )
    );
    return saved;
  }

  private async notifyNextSigner(
    envelope: Envelope,
    tenantId: string,
  ): Promise<void> {
    const signers = await this.findByEnvelope(envelope.id, tenantId);
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
      new Date()
    );
  }

  private async finalizeEnvelope(envelopeId: string, tenantId: string): Promise<void> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    const signers = await this.findByEnvelope(envelopeId, tenantId);

    const evidence = signers.map((s) => ({
      name: s.name,
      email: s.email,
      role: s.role ?? 'signer',
      signedAt: s.signedAt?.toISOString() ?? '',
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

  private async finalizeDocument(
    documentId: string,
    tenantId: string,
    envelope: Envelope,
    evidence: Array<{
      name: string;
      email: string;
      role: string;
      signedAt: string;
      ipAddress: string | null;
      userAgent: string | null;
      signatureData: string | null;
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
      }))
    );

    const originalHash = document.originalHash ?? this.pdfService.computeHash(originalBuffer);
    const signedHash = this.pdfService.computeHash(withSignatures);

    let finalBuffer = await this.pdfService.appendEvidencePage(
      withSignatures,
      evidence,
      document.title,
      envelope.signingLanguage ?? 'en',
      {
        originalHash,
        signedHash,
        certificate: certificateStatus
          ? {
              subject: certificateStatus.subject,
              issuer: certificateStatus.issuer,
            }
          : undefined,
      },
    );

    if (certificateStatus && !certificateStatus.isExpired) {
      try {
        finalBuffer = await this.certificateService.signPdf(tenantId, finalBuffer);
        this.logger.log(`Document ${documentId} digitally signed with tenant certificate`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Digital signature failed for document ${documentId}: ${message}`);
      }
    }

    await this.documentsService.setFinalPdf(documentId, tenantId, finalBuffer);
  }

  private buildAuditTimeline(
    signers: Signer[],
    envelope: { status: EnvelopeStatus; title: string; updatedAt: Date },
  ): AuditTimelineEvent[] {
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

    if (envelope.status === EnvelopeStatus.COMPLETED) {
      timeline.push({
        type: 'completed',
        actorName: envelope.title,
        actorEmail: '',
        timestamp: envelope.updatedAt,
      });
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return timeline;
  }
}
