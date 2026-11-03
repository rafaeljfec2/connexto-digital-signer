import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
} from '../interfaces/invite-delivery.interface';
import { InviteDeliveryService, sanitizeDeliveryError } from './invite-delivery.service';

describe('InviteDeliveryService', () => {
  let service: InviteDeliveryService;
  let attemptRepository: jest.Mocked<
    Pick<
      Repository<SignerInviteDeliveryAttempt>,
      'find' | 'findOne' | 'save' | 'update' | 'createQueryBuilder'
    >
  >;

  beforeEach(() => {
    attemptRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (row: SignerInviteDeliveryAttempt) => ({
        ...row,
        id: 'attempt-id',
      })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: '0' }),
    };
    attemptRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as unknown as ReturnType<Repository<SignerInviteDeliveryAttempt>['createQueryBuilder']>,
    );

    service = new InviteDeliveryService(
      attemptRepository as unknown as Repository<SignerInviteDeliveryAttempt>,
    );
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

    test('should record failed attempt when provider rejects invite', async () => {
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
          errorMessage: 'Email provider did not accept the signature invitation',
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
  });

  describe('sanitizeDeliveryError', () => {
    test('should trim and cap error messages', () => {
      const longMessage = ` ${'x'.repeat(3000)} `;
      const sanitized = sanitizeDeliveryError(new Error(longMessage));
      expect(sanitized.length).toBe(2000);
    });
  });
});
