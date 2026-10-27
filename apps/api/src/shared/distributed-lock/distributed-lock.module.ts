import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { DISTRIBUTED_LOCK_REDIS } from './distributed-lock.constants';
import { DistributedLockService } from './distributed-lock.service';

function createRedisClient(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number.parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    ...(process.env['REDIS_PASSWORD']
      ? { password: process.env['REDIS_PASSWORD'] }
      : {}),
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

@Global()
@Module({
  providers: [
    {
      provide: DISTRIBUTED_LOCK_REDIS,
      useFactory: createRedisClient,
    },
    {
      provide: 'DistributedLockLogger',
      useValue: new Logger(DistributedLockService.name),
    },
    DistributedLockService,
  ],
  exports: [DistributedLockService],
})
export class DistributedLockModule implements OnModuleDestroy {
  constructor(
    @Inject(DISTRIBUTED_LOCK_REDIS) private readonly redis: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
