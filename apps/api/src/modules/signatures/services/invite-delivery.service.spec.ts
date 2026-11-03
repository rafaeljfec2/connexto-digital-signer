import { BadRequestException, ConflictException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
} from '../interfaces/invite-delivery.interface';
import { GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE } from './invite-delivery.constants';
import { InviteDeliveryService } from './invite-delivery.service';

describe('InviteDeliveryService', () => {
  let service: InviteDeliveryService;
  let attemptRepository: jest.Mocked<
    Pick<
      Repository<SignerInviteDeliveryAttempt>,
      'find' | 'findOne' | 'save' | 'update' | 'createQueryBuilder' | 'manager'
    >
  >;
  let maxQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawOne: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    maxQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: '0' }),
      getMany: jest.fn().mockResolvedValue([]),
    };

    attemptRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (row: SignerInviteDeliveryAttempt) => ({
        ...row,
        id: 'attempt-id',
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => maxQueryBuilder as unknown as ReturnType<
        Repository<SignerInviteDeliveryAttempt>['createQueryBuilder']
      >),
      manager: {
        transaction: jest.fn(),
        query: jest.fn(),
      } as unknown as Repository<SignerInviteDeliveryAttempt>['manager'],
    };

    const transactionManager = {
      getRepository: () => attemptRepository,
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;

    (attemptRepository.manager.transaction as jest.Mock).mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(transactionManager),
    );

    service = new InviteDeliveryService(
      attemptRepository as unknown as Repository<SignerInviteDeliveryAttempt>,
    );
  });

  describe('findByEnvelope', () => {
    test('should scope attempts by tenant and envelope', async () => {
      await service.findByEnvelope('env-1', 'tenant-1');

      expect(attemptRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { envelopeId: 'env-1', tenantId: 'tenant-1' },
        }),
      );
    });
  });

  describe('executeInviteDelivery', () => {
    test('should record sent attempt when provider accepts invite', async () => {
      const result = await service.executeInviteDelivery(
        {
          tenantId: 'tenant-1',
          envelopeId: 'env-1',
          signerId: 'signer-1',
          trigger: InviteDeliveryTrigger.INITIAL_SEND,
        },
        async () => 'provider-msg',
      );

      expect(result.attemptNumber).toBe(1);
      expect(attemptRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InviteDeliveryStatus.QUEUED }),
      );
      expect(attemptRepository.update).toHaveBeenCalledWith(
        'attempt-id',
        expect.objectContaining({
          status: InviteDeliveryStatus.SENT,
          providerMessageId: 'provider-msg',
        }),
      );
    });

    test('should record generic failed message when provider rejects invite', async () => {
      await expect(
        service.executeInviteDelivery(
          {
            tenantId: 'tenant-1',
            envelopeId: 'env-1',
            signerId: 'signer-1',
            trigger: InviteDeliveryTrigger.INITIAL_SEND,
          },
          async () => {
            throw new BadRequestException('Email provider did not accept the signature invitation');
          },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(attemptRepository.update).toHaveBeenCalledWith(
        'attempt-id',
        expect.objectContaining({
          status: InviteDeliveryStatus.FAILED,
          errorMessage: GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE,
        }),
      );
    });

    test('should reject when another observed attempt is queued', async () => {
      attemptRepository.findOne.mockResolvedValue({
        id: 'pending',
        trigger: InviteDeliveryTrigger.MANUAL_RESEND,
        status: InviteDeliveryStatus.QUEUED,
      } as SignerInviteDeliveryAttempt);

      await expect(
        service.executeInviteDelivery(
          {
            tenantId: 'tenant-1',
            envelopeId: 'env-1',
            signerId: 'signer-1',
            trigger: InviteDeliveryTrigger.MANUAL_RESEND,
          },
          async () => 'provider-msg',
        ),
      ).rejects.toThrow(ConflictException);
    });

    test('should expire stale queued attempts before starting a new delivery', async () => {
      const staleStartedAt = new Date(Date.now() - 60 * 60 * 1000);
      maxQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'stale-id',
          tenantId: 'tenant-1',
          envelopeId: 'env-1',
          signerId: 'signer-1',
          attemptNumber: 1,
          trigger: InviteDeliveryTrigger.INITIAL_SEND,
          status: InviteDeliveryStatus.QUEUED,
          startedAt: staleStartedAt,
        },
      ]);

      await service.executeInviteDelivery(
        {
          tenantId: 'tenant-1',
          envelopeId: 'env-1',
          signerId: 'signer-1',
          trigger: InviteDeliveryTrigger.MANUAL_RESEND,
        },
        async () => 'provider-msg',
      );

      expect(attemptRepository.update).toHaveBeenCalledWith(
        'stale-id',
        expect.objectContaining({ status: InviteDeliveryStatus.FAILED }),
      );
    });
  });
});
