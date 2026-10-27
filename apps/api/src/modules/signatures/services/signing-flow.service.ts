import type { SignatureCompletedEvent } from '@connexto/events';
import { EVENT_SIGNATURE_COMPLETED } from '@connexto/events';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { Readable } from 'node:stream';
import { Repository } from 'typeorm';
import { DocumentsService } from '../../documents/services/documents.service';
import { SigningMode } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { SignatureFieldType } from '../entities/signature-field.entity';
import { Signer, SignerStatus } from '../entities/signer.entity';
import type { SigningContext } from '../interfaces/audit.interface';
import { validateEnvelopeIsActionable } from '../utils/validate-envelope-actionable';
import { EnvelopeDispatchService } from './envelope-dispatch.service';
import { SignatureFieldsService } from './signature-fields.service';
import { SignaturesService } from './signatures.service';

@Injectable()
export class SigningFlowService {
  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly signaturesService: SignaturesService,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly fieldsService: SignatureFieldsService,
    private readonly envelopeDispatchService: EnvelopeDispatchService,
  ) {}

  async getSignerPdfContent(
    accessToken: string,
    documentId?: string,
  ): Promise<{ readonly stream: Readable; readonly mimeType: string | null }> {
    const target = await this.resolveSignerDocument(accessToken, documentId);
    const stream = await this.documentsService.getOriginalFileStream(target);
    return { stream, mimeType: target.mimeType };
  }

  async getSignerPdfUrl(
    accessToken: string,
    documentId?: string,
  ): Promise<{ url: string; mimeType: string | null; expiresIn: number }> {
    const target = await this.resolveSignerDocument(accessToken, documentId);
    return this.documentsService.getOriginalFileUrl(target);
  }

  async getSignerSignedPdfContent(
    accessToken: string,
    documentId?: string,
  ): Promise<{ readonly stream: Readable; readonly mimeType: string | null } | null> {
    const target = await this.resolveSignerDocument(accessToken, documentId);
    const stream = await this.documentsService.getFinalFileStream(target);
    if (stream === null) {
      return null;
    }
    return { stream, mimeType: target.mimeType };
  }

  async getSignerSignedPdfUrl(
    accessToken: string,
    documentId?: string,
  ): Promise<{ url: string; expiresIn: number } | null> {
    const target = await this.resolveSignerDocument(accessToken, documentId);
    return this.documentsService.getFinalFileUrl(target);
  }

  async getSignerFields(accessToken: string, documentId?: string) {
    const signer = await this.signaturesService.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(
      signer.envelopeId,
      signer.tenantId,
    );

    if (documentId) {
      const target = documents.find((d) => d.id === documentId);
      if (!target) throw new NotFoundException('Document not found in this envelope');
      return this.fieldsService.findBySigner(signer.tenantId, target.id, signer.id);
    }

    const allFields = await Promise.all(
      documents.map((d) =>
        this.fieldsService.findBySigner(signer.tenantId, d.id, signer.id),
      ),
    );
    return allFields.flat();
  }

  async acceptSignature(
    accessToken: string,
    dto: {
      readonly consent: string;
      readonly fields: ReadonlyArray<{ readonly fieldId: string; readonly value: string }>;
      readonly signatureData?: string;
    },
    context: SigningContext,
  ): Promise<Signer> {
    const signer = await this.signaturesService.findByToken(accessToken);
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Document already signed by this signer');
    }
    if (signer.authMethod === 'email' && signer.verifiedAt === null) {
      throw new BadRequestException('Verification required');
    }

    const envelope = await this.envelopesService.findOne(signer.envelopeId, signer.tenantId);
    validateEnvelopeIsActionable(envelope);

    await Promise.all(
      dto.fields.map((field) =>
        this.fieldsService.updateValueByFieldId(
          signer.tenantId,
          field.fieldId,
          field.value,
        ),
      ),
    );

    if (dto.signatureData) {
      await this.applySignatureDataToEmptyFields(
        signer.tenantId,
        signer.envelopeId,
        signer.id,
        dto.signatureData,
      );
    }

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

    const allSigned = await this.envelopeDispatchService.areAllSignersSigned(
      envelope.id,
      signer.tenantId,
    );
    if (allSigned) {
      await this.envelopeDispatchService.finalizeEnvelope(envelope.id, signer.tenantId);
    } else if (envelope.signingMode === SigningMode.SEQUENTIAL) {
      await this.envelopeDispatchService.notifyNextSigner(envelope, signer.tenantId);
    }

    return saved;
  }

  private async applySignatureDataToEmptyFields(
    tenantId: string,
    envelopeId: string,
    signerId: string,
    signatureData: string,
  ): Promise<void> {
    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    const fieldsByDocument = await Promise.all(
      documents.map((document) =>
        this.fieldsService.findBySigner(tenantId, document.id, signerId),
      ),
    );
    const emptySignatureFields = fieldsByDocument
      .flat()
      .filter(
        (field) =>
          field.type === SignatureFieldType.SIGNATURE &&
          (field.value === null || field.value.length === 0),
      );

    await Promise.all(
      emptySignatureFields.map((field) =>
        this.fieldsService.updateValueByFieldId(tenantId, field.id, signatureData),
      ),
    );
  }

  private async resolveSignerDocument(accessToken: string, documentId?: string) {
    const signer = await this.signaturesService.findByToken(accessToken);
    const documents = await this.documentsService.findByEnvelope(
      signer.envelopeId,
      signer.tenantId,
    );

    const target = documentId
      ? documents.find((d) => d.id === documentId)
      : documents[0];

    if (!target) {
      throw new NotFoundException('Document not found in this envelope');
    }

    return target;
  }
}
