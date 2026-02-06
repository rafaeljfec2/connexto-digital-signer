import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_DOCUMENT_CREATED } from '@connexto/events';
import type { DocumentCreatedEvent } from '@connexto/events';
import { BillingService } from '../services/billing.service';

@Injectable()
export class BillingEventsHandler {
  constructor(private readonly billingService: BillingService) {}

  @OnEvent(EVENT_DOCUMENT_CREATED)
  async handleDocumentCreated(payload: DocumentCreatedEvent): Promise<void> {
    await this.billingService.incrementDocumentCount(payload.tenantId);
  }
}
