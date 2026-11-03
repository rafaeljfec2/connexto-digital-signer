import { Injectable } from '@nestjs/common';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { CertificateService } from '../../tenants/services/certificate.service';
import type { Signer } from '../entities/signer.entity';
import type {
  AuditTimelineEvent,
  DocumentAuditSummary,
} from '../interfaces/audit.interface';
import { SignaturesService } from './signatures.service';
import { InviteDeliveryService } from './invite-delivery.service';
import type { SignerInviteDeliveryDto } from '../interfaces/invite-delivery.interface';

@Injectable()
export class EnvelopeAuditService {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly certificateService: CertificateService,
    private readonly inviteDeliveryService: InviteDeliveryService,
  ) {}

  async getEnvelopeTracking(envelopeId: string, tenantId: string) {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);
    const deliveryBySigner = await this.inviteDeliveryService.findByEnvelope(
      envelopeId,
      tenantId,
    );

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
        inviteDelivery: serializeInviteDeliveryForTracking(
          deliveryBySigner.get(signer.id) ?? emptyInviteDelivery(),
        ),
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

  async getEnvelopeAuditSummary(
    envelopeId: string,
    tenantId: string,
  ): Promise<DocumentAuditSummary> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);
    const timeline = this.buildAuditTimeline(signers, envelope);
    const completedAt = envelope.status === EnvelopeStatus.COMPLETED ? envelope.updatedAt : null;
    const primaryDocument = documents.length === 1 ? documents[0] : null;
    const certificateStatus = await this.certificateService.getCertificateStatus(tenantId);

    return {
      document: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        signingMode: envelope.signingMode,
        createdAt: envelope.createdAt,
        expiresAt: envelope.expiresAt,
        completedAt,
        originalHash: primaryDocument?.originalHash ?? null,
        finalHash: primaryDocument?.finalHash ?? null,
      },
      documents: documents.map((document) => ({
        id: document.id,
        title: document.title,
        status: document.status,
        originalHash: document.originalHash,
        finalHash: document.finalHash,
      })),
      certificate: certificateStatus
        ? {
            subject: certificateStatus.subject,
            issuer: certificateStatus.issuer,
            expiresAt: certificateStatus.expiresAt
              ? new Date(certificateStatus.expiresAt)
              : null,
            isExpired: certificateStatus.isExpired,
          }
        : null,
      timezone: 'UTC',
      signers: signers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        authMethod: s.authMethod,
        notifiedAt: s.notifiedAt,
        viewedAt: s.viewedAt,
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
    const signer = await this.signaturesService.findByToken(accessToken);
    return this.getEnvelopeAuditSummary(signer.envelopeId, signer.tenantId);
  }

  private buildAuditTimeline(
    signers: Signer[],
    envelope: { readonly status: EnvelopeStatus; readonly title: string; readonly updatedAt: Date },
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
      if (signer.viewedAt) {
        timeline.push({
          type: 'viewed',
          actorName: signer.name,
          actorEmail: signer.email,
          timestamp: signer.viewedAt,
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

const emptyInviteDelivery = (): SignerInviteDeliveryDto => ({
  currentStatus: null,
  currentAttemptNumber: null,
  lastFinishedAt: null,
  isHistoricalEstimate: false,
  manualResendCount: 0,
  attempts: [],
});

export const serializeInviteDeliveryForTracking = (
  delivery: SignerInviteDeliveryDto,
): Readonly<{
  currentStatus: SignerInviteDeliveryDto['currentStatus'];
  currentAttemptNumber: number | null;
  lastFinishedAt: string | null;
  isHistoricalEstimate: boolean;
  manualResendCount: number;
  attempts: ReadonlyArray<{
    attemptNumber: number;
    trigger: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
    isLegacy: boolean;
  }>;
}> => ({
  currentStatus: delivery.currentStatus,
  currentAttemptNumber: delivery.currentAttemptNumber,
  lastFinishedAt: delivery.lastFinishedAt?.toISOString() ?? null,
  isHistoricalEstimate: delivery.isHistoricalEstimate,
  manualResendCount: delivery.manualResendCount,
  attempts: delivery.attempts.map((attempt) => ({
    attemptNumber: attempt.attemptNumber,
    trigger: attempt.trigger,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    finishedAt: attempt.finishedAt?.toISOString() ?? null,
    errorMessage: attempt.errorMessage,
    isLegacy: attempt.isLegacy,
  })),
});