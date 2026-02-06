import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENT_SIGNATURE_COMPLETED,
  EVENT_DOCUMENT_COMPLETED,
  EVENT_DOCUMENT_EXPIRED,
} from '@connexto/events';
import type {
  SignatureCompletedEvent,
  DocumentCompletedEvent,
  DocumentExpiredEvent,
} from '@connexto/events';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditEventsHandler {
  constructor(private readonly auditService: AuditService) {}

  @OnEvent(EVENT_SIGNATURE_COMPLETED)
  async handleSignatureCompleted(payload: SignatureCompletedEvent): Promise<void> {
    await this.auditService.log({
      tenantId: payload.tenantId,
      eventType: 'signature.completed',
      entityType: 'signer',
      entityId: payload.signerId,
      actorId: payload.signerId,
      actorType: 'signer',
      metadata: {
        documentId: payload.documentId,
        signedAt: payload.signedAt.toISOString(),
      },
    });
  }

  @OnEvent(EVENT_DOCUMENT_COMPLETED)
  async handleDocumentCompleted(payload: DocumentCompletedEvent): Promise<void> {
    await this.auditService.log({
      tenantId: payload.tenantId,
      eventType: 'document.completed',
      entityType: 'document',
      entityId: payload.documentId,
      metadata: { completedAt: payload.completedAt.toISOString() },
    });
  }

  @OnEvent(EVENT_DOCUMENT_EXPIRED)
  async handleDocumentExpired(payload: DocumentExpiredEvent): Promise<void> {
    await this.auditService.log({
      tenantId: payload.tenantId,
      eventType: 'document.expired',
      entityType: 'document',
      entityId: payload.documentId,
      metadata: { expiredAt: payload.expiredAt.toISOString() },
    });
  }
}
