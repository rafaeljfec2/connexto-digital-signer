import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_SIGNER_ADDED } from '@connexto/events';
import type { SignerAddedEvent } from '@connexto/events';
import { NotificationsService } from '../services/notifications.service';

const BASE_URL = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';

@Injectable()
export class NotificationEventsHandler {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(EVENT_SIGNER_ADDED)
  async handleSignerAdded(payload: SignerAddedEvent): Promise<void> {
    const signUrl = `${BASE_URL}/sign/${payload.accessToken}`;
    await this.notificationsService.sendSignatureInvite({
      tenantId: payload.tenantId,
      signerEmail: payload.signerEmail,
      signerName: payload.signerName,
      documentTitle: payload.documentTitle,
      signUrl,
    });
  }
}
