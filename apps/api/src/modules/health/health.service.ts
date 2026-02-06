import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import type { Queue } from 'bull';

export interface HealthResult {
  status: 'ok' | 'error';
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue
  ) {}

  async readiness(): Promise<HealthResult> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const status = database === 'ok' && redis === 'ok' ? 'ok' : 'error';
    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
    };
  }

  liveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    try {
      const pong = await this.notificationsQueue.client.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}
