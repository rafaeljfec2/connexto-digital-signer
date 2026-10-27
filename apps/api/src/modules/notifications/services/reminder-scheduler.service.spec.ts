import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { Envelope, EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
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
  let notificationsService: { sendSignatureReminder: jest.Mock };
  let lockService: { acquire: jest.Mock; release: jest.Mock };
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
    notificationsService = {
      sendSignatureReminder: jest.fn().mockResolvedValue(undefined),
    };
    lockService = {
      acquire: jest.fn().mockResolvedValue('lock-token'),
      release: jest.fn().mockResolvedValue(true),
    };
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as Logger;

    service = new ReminderSchedulerService(
      envelopeRepository as unknown as Repository<Envelope>,
      signerRepository as unknown as Repository<Signer>,
      notificationsService as unknown as NotificationsService,
      lockService as unknown as DistributedLockService,
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
});
