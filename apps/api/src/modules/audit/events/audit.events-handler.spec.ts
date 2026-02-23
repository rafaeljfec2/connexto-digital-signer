import { AuditEventsHandler } from './audit.events-handler';
import { AuditService } from '../services/audit.service';

describe('AuditEventsHandler', () => {
  let auditService: jest.Mocked<AuditService>;
  let handler: AuditEventsHandler;

  beforeEach(() => {
    auditService = {
      log: jest.fn(),
      findByEntity: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;
    handler = new AuditEventsHandler(auditService);
  });

  test('should log user login success', async () => {
    await handler.handleUserLoginSuccess({
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'owner@acme.com',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      loginAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        eventType: 'user.login.success',
        entityType: 'user',
        entityId: 'user-1',
        actorId: 'user-1',
        actorType: 'user',
      })
    );
  });

  test('should log user login failed', async () => {
    await handler.handleUserLoginFailed({
      email: 'owner@acme.com',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'invalid_credentials',
      attemptedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'system',
        eventType: 'user.login.failed',
        entityType: 'user',
        entityId: 'owner@acme.com',
        actorType: 'anonymous',
      })
    );
  });

  test('should log signature completed with geolocation', async () => {
    await handler.handleSignatureCompleted({
      documentId: 'doc-1',
      tenantId: 'tenant-1',
      signerId: 'signer-1',
      signedAt: new Date('2026-01-01T10:00:00.000Z'),
      ipAddress: '192.168.0.1',
      userAgent: 'Mozilla/5.0',
      latitude: -23.5505199,
      longitude: -46.6333094,
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        eventType: 'signature.completed',
        entityType: 'signer',
        entityId: 'signer-1',
        actorId: 'signer-1',
        actorType: 'signer',
        metadata: expect.objectContaining({
          documentId: 'doc-1',
          ipAddress: '192.168.0.1',
          userAgent: 'Mozilla/5.0',
          latitude: -23.5505199,
          longitude: -46.6333094,
        }),
      })
    );
  });

  test('should log signature completed without geolocation', async () => {
    await handler.handleSignatureCompleted({
      documentId: 'doc-1',
      tenantId: 'tenant-1',
      signerId: 'signer-1',
      signedAt: new Date('2026-01-01T10:00:00.000Z'),
      ipAddress: '192.168.0.1',
      userAgent: 'Mozilla/5.0',
    });

    const call = auditService.log.mock.calls[0][0];
    expect(call.metadata).not.toHaveProperty('latitude');
    expect(call.metadata).not.toHaveProperty('longitude');
    expect(call.metadata).toHaveProperty('ipAddress', '192.168.0.1');
  });

  test('should log user logout', async () => {
    await handler.handleUserLogout({
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'owner@acme.com',
      logoutAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        eventType: 'user.logout',
        entityType: 'user',
        entityId: 'user-1',
        actorId: 'user-1',
        actorType: 'user',
      })
    );
  });
});
