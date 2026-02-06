import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENT_DOCUMENT_COMPLETED,
  EVENT_DOCUMENT_CREATED,
  EVENT_DOCUMENT_EXPIRED,
  EVENT_SIGNATURE_COMPLETED,
} from '@connexto/events';
import type {
  DocumentCompletedEvent,
  DocumentCreatedEvent,
  DocumentExpiredEvent,
  SignatureCompletedEvent,
} from '@connexto/events';
import { WebhooksService } from '../services/webhooks.service';

@Injectable()
export class WebhookEventsHandler {
  constructor(private readonly webhooksService: WebhooksService) {}

  @OnEvent(EVENT_DOCUMENT_CREATED)
  async handleDocumentCreated(payload: DocumentCreatedEvent): Promise<void> {
    await this.webhooksService.dispatch(
      payload.tenantId,
      'document.created',
      {
        documentId: payload.documentId,
        title: payload.title,
        createdAt: payload.createdAt.toISOString(),
      }
    );
  }

  @OnEvent(EVENT_DOCUMENT_COMPLETED)
  async handleDocumentCompleted(payload: DocumentCompletedEvent): Promise<void> {
    await this.webhooksService.dispatch(
      payload.tenantId,
      'document.completed',
      {
        documentId: payload.documentId,
        completedAt: payload.completedAt.toISOString(),
      }
    );
  }

  @OnEvent(EVENT_DOCUMENT_EXPIRED)
  async handleDocumentExpired(payload: DocumentExpiredEvent): Promise<void> {
    await this.webhooksService.dispatch(
      payload.tenantId,
      'document.expired',
      {
        documentId: payload.documentId,
        expiredAt: payload.expiredAt.toISOString(),
      }
    );
  }

  @OnEvent(EVENT_SIGNATURE_COMPLETED)
  async handleSignatureCompleted(payload: SignatureCompletedEvent): Promise<void> {
    await this.webhooksService.dispatch(
      payload.tenantId,
      'signature.signed',
      {
        documentId: payload.documentId,
        signerId: payload.signerId,
        signedAt: payload.signedAt.toISOString(),
      }
    );
  }
}
