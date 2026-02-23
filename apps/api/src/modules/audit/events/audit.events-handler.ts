import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENT_SIGNATURE_COMPLETED,
  EVENT_DOCUMENT_COMPLETED,
  EVENT_DOCUMENT_EXPIRED,
  EVENT_USER_LOGIN_SUCCESS,
  EVENT_USER_LOGIN_FAILED,
  EVENT_USER_LOGOUT,
} from '@connexto/events';
import type {
  SignatureCompletedEvent,
  DocumentCompletedEvent,
  DocumentExpiredEvent,
  UserLoginSuccessEvent,
  UserLoginFailedEvent,
  UserLogoutEvent,
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
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        ...(payload.latitude != null && payload.longitude != null && {
          latitude: payload.latitude,
          longitude: payload.longitude,
        }),
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

  @OnEvent(EVENT_USER_LOGIN_SUCCESS)
  async handleUserLoginSuccess(payload: UserLoginSuccessEvent): Promise<void> {
    await this.auditService.log({
      tenantId: payload.tenantId,
      eventType: 'user.login.success',
      entityType: 'user',
      entityId: payload.userId,
      actorId: payload.userId,
      actorType: 'user',
      metadata: {
        email: payload.email,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        loginAt: payload.loginAt.toISOString(),
      },
    });
  }

  @OnEvent(EVENT_USER_LOGIN_FAILED)
  async handleUserLoginFailed(payload: UserLoginFailedEvent): Promise<void> {
    await this.auditService.log({
      tenantId: 'system',
      eventType: 'user.login.failed',
      entityType: 'user',
      entityId: payload.email,
      actorType: 'anonymous',
      metadata: {
        email: payload.email,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        reason: payload.reason,
        attemptedAt: payload.attemptedAt.toISOString(),
      },
    });
  }

  @OnEvent(EVENT_USER_LOGOUT)
  async handleUserLogout(payload: UserLogoutEvent): Promise<void> {
    await this.auditService.log({
      tenantId: payload.tenantId,
      eventType: 'user.logout',
      entityType: 'user',
      entityId: payload.userId,
      actorId: payload.userId,
      actorType: 'user',
      metadata: {
        email: payload.email,
        logoutAt: payload.logoutAt.toISOString(),
      },
    });
  }
}
