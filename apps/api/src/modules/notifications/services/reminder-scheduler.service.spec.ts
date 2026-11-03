import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EVENT_DOCUMENT_EXPIRED,
  EVENT_DOCUMENT_COMPLETED,
  type DocumentExpiredEvent,
} from '@connexto/events';
import type { Repository } from 'typeorm';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import {
  Envelope,
  EnvelopeStatus,
  SigningMode,
} from '../../envelopes/entities/envelope.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { Signer, SignerStatus } from '../../signatures/entities/signer.entity';
import type { NotificationsService } from './notifications.service';
import type { DistributedLockService } from '../../../shared/distributed-lock/distributed-lock.service';

const buildEnvelope = (overrides?: Partial<Envelope>): Envelope =>
  ({
    id: 'envelope-1',
    tenantId: 'tenant-1',
    folderId: 'folder-1',
    title: 'Contract',
    status: EnvelopeStatus.PENDING_SIGNATURES,
    reminderInterval: '1_day',
    signingLanguage: 'en',
    expiresAt: null,
    ...overrides,
  }) as Envelope;

const buildSigner = (overrides?: Partial<Signer>): Signer =>
  ({
    id: 'signer-1',
    tenantId: 'tenant-1',
    envelopeId: 'envelope-1',
    name: 'Alice',
    email: 'alice@example.com',
    status: SignerStatus.PENDING,
    accessToken: 'token-abc',
    reminderCount: 0,
    notifiedAt: new Date('2020-01-01T00:00:00.000Z'),
    ...overrides,
  }) as Signer;

describe('ReminderSchedulerService', () => {
  let envelopeRepository: {
    find: jest.Mock;
    update: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let signerRepository: { find: jest.Mock; update: jest.Mock };
  let documentRepository: { find: jest.Mock };
  let notificationsService: { sendSignatureReminder: jest.Mock };
  let lockService: { acquire: jest.Mock; release: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let logger: Logger;
  let service: ReminderSchedulerService;

  beforeEach(() => {
    envelopeRepository = {
      find: jest.fn(),
      update: jest.fn(),
      manager: { transaction: jest.fn() },
    };
    signerRepository = {
      find: jest.fn(),
      update: jest.fn(),
    };
    documentRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    notificationsService = {
      sendSignatureReminder: jest.fn().mockResolvedValue(undefined),
    };
    lockService = {
      acquire: jest.fn().mockResolvedValue('lock-token'),
      release: jest.fn().mockResolvedValue(true),
    };
    eventEmitter = { emit: jest.fn() };
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as Logger;

    service = new ReminderSchedulerService(
      envelopeRepository as unknown as Repository<Envelope>,
      signerRepository as unknown as Repository<Signer>,
      documentRepository as unknown as Repository<Document>,
      notificationsService as unknown as NotificationsService,
      lockService as unknown as DistributedLockService,
      eventEmitter as unknown as EventEmitter2,
      logger,
    );
  });

  describe('handleReminders lock', () => {
    it('should skip the tick when the lock is not acquired', async () => {
      lockService.acquire.mockResolvedValue(null);

      await service.handleReminders();

      expect(envelopeRepository.find).not.toHaveBeenCalled();
      expect(lockService.release).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('lock not acquired'),
      );
    });

    it('should not run the body when Redis fails on acquire', async () => {
      lockService.acquire.mockRejectedValue(new Error('redis down'));

      await service.handleReminders();

      expect(envelopeRepository.find).not.toHaveBeenCalled();
      expect(lockService.release).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should release the lock after a successful tick', async () => {
      envelopeRepository.find.mockResolvedValue([]);

      await service.handleReminders();

      expect(lockService.release).toHaveBeenCalledWith(
        'nexosign:cron:reminders',
        'lock-token',
      );
    });
  });

  describe('runReminders claim', () => {
    it('should claim then enqueue a due reminder', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({ reminderCount: 0 });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([signer]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledWith(
        {
          id: signer.id,
          tenantId: envelope.tenantId,
          reminderCount: 0,
          status: SignerStatus.PENDING,
        },
        expect.objectContaining({
          reminderCount: 1,
          notifiedAt: expect.any(Date),
        }),
      );
      expect(notificationsService.sendSignatureReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          signerEmail: 'alice@example.com',
          reminderCount: 1,
          maxReminders: 3,
        }),
      );
    });

    it('should not enqueue when claim affects zero rows', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({ reminderCount: 0 });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([signer]);
      signerRepository.update.mockResolvedValue({ affected: 0 });

      await service.runReminders();

      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should not enqueue when the reminder interval has not elapsed', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({ reminderCount: 1, notifiedAt: new Date() });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([signer]);

      await service.runReminders();

      expect(signerRepository.update).not.toHaveBeenCalled();
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should not enqueue again when a concurrent claim already advanced reminderCount', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({
        reminderCount: 0,
        notifiedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([signer]);
      signerRepository.update.mockResolvedValue({ affected: 0 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ reminderCount: 0 }),
        expect.objectContaining({ reminderCount: 1 }),
      );
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });
  });

  describe('runExpiredEnvelopes claim', () => {
    it('should claim once then update documents', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([]);
      const managerUpdate = jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) =>
          cb({ update: managerUpdate }),
      );

      await service.runExpiredEnvelopes();

      expect(managerUpdate).toHaveBeenCalledWith(
        Envelope,
        expect.objectContaining({
          id: envelope.id,
          status: EnvelopeStatus.PENDING_SIGNATURES,
        }),
        { status: EnvelopeStatus.EXPIRED },
      );
      expect(managerUpdate).toHaveBeenCalledWith(
        Document,
        { envelopeId: envelope.id, tenantId: envelope.tenantId },
        { status: DocumentStatus.EXPIRED },
      );
    });

    it('should not update documents when envelope claim affects zero rows', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([]);

      const managerUpdate = jest.fn().mockResolvedValue({ affected: 0 });
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<void>) => {
          await cb({ update: managerUpdate });
        },
      );

      await service.runExpiredEnvelopes();

      expect(managerUpdate).toHaveBeenCalledTimes(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        Envelope,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('I0-AC1 (policy A1 — partial signatures at expiry)', () => {
    it('should mark envelope and documents expired when signatures are partial at expiry', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([
        buildSigner({ id: 'signer-signed', status: SignerStatus.SIGNED }),
      ]);

      const managerUpdate = jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) =>
          cb({ update: managerUpdate }),
      );

      await service.runExpiredEnvelopes();

      expect(managerUpdate).toHaveBeenCalledWith(
        Envelope,
        expect.objectContaining({ id: envelope.id }),
        { status: EnvelopeStatus.EXPIRED },
      );
      expect(managerUpdate).toHaveBeenCalledWith(
        Document,
        { envelopeId: envelope.id, tenantId: envelope.tenantId },
        { status: DocumentStatus.EXPIRED },
      );
      expect(managerUpdate).not.toHaveBeenCalledWith(
        Envelope,
        expect.anything(),
        { status: EnvelopeStatus.COMPLETED },
      );
      expect(managerUpdate).not.toHaveBeenCalledWith(
        Document,
        expect.anything(),
        { status: DocumentStatus.COMPLETED },
      );
    });
  });

  describe('Increment 1 — partial expiry (A1)', () => {
    it('should emit document.expired for each expired document and not emit document.completed', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      const expiredDoc = {
        id: 'doc-1',
        tenantId: envelope.tenantId,
        envelopeId: envelope.id,
        status: DocumentStatus.EXPIRED,
      } as Document;
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([
        buildSigner({ id: 'signer-signed', status: SignerStatus.SIGNED }),
      ]);
      documentRepository.find.mockResolvedValue([expiredDoc]);

      const managerUpdate = jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) =>
          cb({ update: managerUpdate }),
      );

      await service.runExpiredEnvelopes();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_EXPIRED,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: envelope.tenantId,
          expiredAt: expect.any(Date),
        }) as DocumentExpiredEvent,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        EVENT_DOCUMENT_COMPLETED,
        expect.anything(),
      );
    });

    it('should preserve signed signers without deleting them', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      const signed = buildSigner({ id: 'signer-signed', status: SignerStatus.SIGNED });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([signed]);
      documentRepository.find.mockResolvedValue([]);
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) =>
          cb({ update: jest.fn().mockResolvedValue({ affected: 1 }) }),
      );

      await service.runExpiredEnvelopes();

      expect(signerRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: SignerStatus.SIGNED }),
        }),
      );
      expect(signerRepository.update).not.toHaveBeenCalled();
    });

    it('should be idempotent when envelope claim affects zero rows', async () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const envelope = buildEnvelope({ expiresAt: past });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([]);
      envelopeRepository.manager.transaction.mockImplementation(
        async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) =>
          cb({ update: jest.fn().mockResolvedValue({ affected: 0 }) }),
      );

      await service.runExpiredEnvelopes();

      expect(documentRepository.find).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('I0-AC3 (policy C1 — sequential reminder eligibility)', () => {
    it('should not send reminder when pending signer was never invited (notifiedAt null)', async () => {
      const envelope = buildEnvelope({
        signingMode: SigningMode.SEQUENTIAL,
        reminderInterval: '1_day',
      });
      const neverInvited = buildSigner({
        id: 'signer-2',
        notifiedAt: null,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([neverInvited]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).not.toHaveBeenCalled();
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });
  });

  describe('Increment 2 — sequential reminders (C1)', () => {
    const sequentialEnvelope = (): Envelope =>
      buildEnvelope({
        signingMode: SigningMode.SEQUENTIAL,
        reminderInterval: '1_day',
      });

    const invitedAt = new Date('2020-01-01T00:00:00.000Z');

    it('should send reminder to the first pending signer when notified in sequential mode', async () => {
      const envelope = sequentialEnvelope();
      const first = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([first]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledTimes(1);
      expect(signerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'signer-1' }),
        expect.objectContaining({ reminderCount: 1 }),
      );
      expect(notificationsService.sendSignatureReminder).toHaveBeenCalledTimes(1);
    });

    it('should not send reminder to active sequential signer without notifiedAt', async () => {
      const envelope = sequentialEnvelope();
      const firstNotInvited = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: null,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([firstNotInvited]);

      await service.runReminders();

      expect(signerRepository.update).not.toHaveBeenCalled();
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should not send reminder to second signer while first is still pending', async () => {
      const envelope = sequentialEnvelope();
      const first = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      const second = buildSigner({
        id: 'signer-2',
        order: 2,
        email: 'bob@example.com',
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([first, second]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledTimes(1);
      expect(signerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'signer-1' }),
        expect.anything(),
      );
      expect(notificationsService.sendSignatureReminder).toHaveBeenCalledWith(
        expect.objectContaining({ signerEmail: 'alice@example.com' }),
      );
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalledWith(
        expect.objectContaining({ signerEmail: 'bob@example.com' }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'reminder.skipped',
          envelopeId: envelope.id,
          tenantId: envelope.tenantId,
          signerId: 'signer-2',
          reason: 'sequential-not-active',
        }),
      );
    });

    it('should send reminder to next signer after prior signers signed when notified', async () => {
      const envelope = sequentialEnvelope();
      const secondActive = buildSigner({
        id: 'signer-2',
        order: 2,
        email: 'bob@example.com',
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([secondActive]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'signer-2' }),
        expect.objectContaining({ reminderCount: 1 }),
      );
      expect(notificationsService.sendSignatureReminder).toHaveBeenCalledWith(
        expect.objectContaining({ signerEmail: 'bob@example.com' }),
      );
    });

    it('should only query pending signers so signed signers never receive reminders', async () => {
      const envelope = sequentialEnvelope();
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([]);

      await service.runReminders();

      expect(signerRepository.find).toHaveBeenCalledWith({
        where: {
          envelopeId: envelope.id,
          tenantId: envelope.tenantId,
          status: SignerStatus.PENDING,
        },
      });
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should respect MAX_REMINDERS for the active sequential signer', async () => {
      const envelope = sequentialEnvelope();
      const first = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: invitedAt,
        reminderCount: 3,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([first]);

      await service.runReminders();

      expect(signerRepository.update).not.toHaveBeenCalled();
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should respect reminder interval for the active sequential signer', async () => {
      const envelope = sequentialEnvelope();
      const first = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: new Date(),
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([first]);

      await service.runReminders();

      expect(signerRepository.update).not.toHaveBeenCalled();
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should not duplicate reminders when concurrent claim loses the race', async () => {
      const envelope = sequentialEnvelope();
      const first = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([first]);
      signerRepository.update.mockResolvedValue({ affected: 0 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledTimes(1);
      expect(notificationsService.sendSignatureReminder).not.toHaveBeenCalled();
    });

    it('should allow parallel mode to remind every notified pending signer', async () => {
      const envelope = buildEnvelope({
        signingMode: SigningMode.PARALLEL,
        reminderInterval: '1_day',
      });
      const alice = buildSigner({
        id: 'signer-1',
        order: 1,
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      const bob = buildSigner({
        id: 'signer-2',
        order: 2,
        email: 'bob@example.com',
        notifiedAt: invitedAt,
        reminderCount: 0,
      });
      envelopeRepository.find.mockResolvedValue([envelope]);
      signerRepository.find.mockResolvedValue([alice, bob]);
      signerRepository.update.mockResolvedValue({ affected: 1 });

      await service.runReminders();

      expect(signerRepository.update).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendSignatureReminder).toHaveBeenCalledTimes(2);
    });
  });
});
