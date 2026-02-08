import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EVENT_SIGNER_ADDED,
  EVENT_DOCUMENT_COMPLETED,
  EVENT_TENANT_CREATED,
} from '@connexto/events';
import type {
  SignerAddedEvent,
  DocumentCompletedEvent,
  TenantCreatedEvent,
} from '@connexto/events';
import { User, UserRole } from '../../users/entities/user.entity';
import { Document } from '../../documents/entities/document.entity';
import { NotificationsService } from '../services/notifications.service';

const WEB_URL = process.env['WEB_BASE_URL'] ?? 'http://localhost:3001';

@Injectable()
export class NotificationEventsHandler {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject('NotificationEventsLogger') private readonly logger: Logger,
  ) {}

  @OnEvent(EVENT_SIGNER_ADDED)
  async handleSignerAdded(payload: SignerAddedEvent): Promise<void> {
    const signUrl = `${WEB_URL}/pt-br/sign/${payload.accessToken}`;
    await this.notificationsService.sendSignatureInvite({
      tenantId: payload.tenantId,
      signerEmail: payload.signerEmail,
      signerName: payload.signerName,
      documentTitle: payload.documentTitle,
      signUrl,
    });
  }

  @OnEvent(EVENT_DOCUMENT_COMPLETED)
  async handleDocumentCompleted(payload: DocumentCompletedEvent): Promise<void> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: payload.documentId, tenantId: payload.tenantId },
      });

      if (!document) return;

      const owner = await this.userRepository.findOne({
        where: { tenantId: payload.tenantId, role: UserRole.OWNER },
      });

      if (!owner) return;

      const locale = document.signingLanguage ?? 'pt-br';
      const documentUrl = `${WEB_URL}/${locale}/documents/${document.id}/summary`;

      await this.notificationsService.sendDocumentCompleted({
        ownerEmail: owner.email,
        ownerName: owner.name,
        documentTitle: document.title,
        documentUrl,
        locale,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send document completed email for ${payload.documentId}: ${message}`,
      );
    }
  }

  @OnEvent(EVENT_TENANT_CREATED)
  async handleTenantCreated(payload: TenantCreatedEvent): Promise<void> {
    try {
      const dashboardUrl = `${WEB_URL}/pt-br`;

      await this.notificationsService.sendWelcome({
        ownerEmail: payload.ownerEmail,
        ownerName: payload.ownerName,
        dashboardUrl,
        locale: 'pt-br',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send welcome email for tenant ${payload.tenantId}: ${message}`,
      );
    }
  }
}
