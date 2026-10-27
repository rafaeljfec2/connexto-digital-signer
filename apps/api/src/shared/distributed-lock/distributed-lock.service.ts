import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { DISTRIBUTED_LOCK_REDIS } from './distributed-lock.constants';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class DistributedLockService {
  constructor(
    @Inject(DISTRIBUTED_LOCK_REDIS) private readonly redis: Redis,
    @Inject('DistributedLockLogger') private readonly logger: Logger,
  ) {}

  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return token;
    }
    return null;
  }

  async release(key: string, token: string): Promise<boolean> {
    try {
      const result = await this.redis.eval(RELEASE_SCRIPT, 1, key, token);
      return result === 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to release lock ${key}: ${message}`);
      return false;
    }
  }
}
