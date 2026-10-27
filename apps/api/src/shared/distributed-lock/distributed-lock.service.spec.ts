import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { DistributedLockService } from './distributed-lock.service';

describe('DistributedLockService', () => {
  let redis: {
    set: jest.Mock;
    eval: jest.Mock;
  };
  let service: DistributedLockService;

  beforeEach(() => {
    redis = {
      set: jest.fn(),
      eval: jest.fn(),
    };
    service = new DistributedLockService(
      redis as unknown as Redis,
      new Logger('DistributedLockService'),
    );
  });

  describe('acquire', () => {
    it('should return a token when SET NX succeeds', async () => {
      redis.set.mockResolvedValue('OK');

      const token = await service.acquire('nexosign:cron:reminders', 50 * 60 * 1000);

      expect(token).toEqual(expect.any(String));
      expect(token).not.toBeNull();
      expect(redis.set).toHaveBeenCalledWith(
        'nexosign:cron:reminders',
        token,
        'PX',
        50 * 60 * 1000,
        'NX',
      );
    });

    it('should return null when the lock is already held', async () => {
      redis.set.mockResolvedValue(null);

      const token = await service.acquire('nexosign:cron:reminders', 1000);

      expect(token).toBeNull();
    });

    it('should throw when Redis fails during acquire', async () => {
      redis.set.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.acquire('nexosign:cron:reminders', 1000)).rejects.toThrow(
        'ECONNREFUSED',
      );
    });
  });

  describe('release', () => {
    it('should return true when the token matches', async () => {
      redis.eval.mockResolvedValue(1);

      await expect(service.release('nexosign:cron:reminders', 'token-a')).resolves.toBe(true);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'nexosign:cron:reminders',
        'token-a',
      );
    });

    it('should return false when the token does not match', async () => {
      redis.eval.mockResolvedValue(0);

      await expect(service.release('nexosign:cron:reminders', 'wrong-token')).resolves.toBe(
        false,
      );
    });
  });
});
