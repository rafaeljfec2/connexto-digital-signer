import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHmac } from 'crypto';
import { WebhookConfig } from '../entities/webhook-config.entity';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
export interface WebhookPayload {
  event: string;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookConfig)
    private readonly webhookRepository: Repository<WebhookConfig>,
    @InjectQueue('webhooks')
    private readonly queue: Queue
  ) {}

  async create(tenantId: string, dto: CreateWebhookConfigDto): Promise<WebhookConfig> {
    const config = this.webhookRepository.create({
      tenantId,
      url: dto.url,
      secret: dto.secret,
      events: dto.events,
      retryConfig: dto.retryConfig ?? null,
    });
    return this.webhookRepository.save(config);
  }

  async findByTenant(tenantId: string): Promise<WebhookConfig[]> {
    return this.webhookRepository.find({
      where: { tenantId, isActive: true },
    });
  }

  async findSubscribed(tenantId: string, event: string): Promise<WebhookConfig[]> {
    const configs = await this.webhookRepository.find({
      where: { tenantId, isActive: true },
    });
    return configs.filter((c) => c.events.includes(event));
  }

  async dispatch(tenantId: string, event: string, data: Record<string, unknown>): Promise<void> {
    const configs = await this.findSubscribed(tenantId, event);
    const payload: WebhookPayload = {
      event,
      tenantId,
      timestamp: new Date().toISOString(),
      data,
    };
    for (const config of configs) {
      await this.queue.add(
        'deliver',
        { webhookConfigId: config.id, payload },
        {
          attempts: config.retryConfig?.maxAttempts ?? 3,
          backoff: {
            type: 'exponential',
            delay: config.retryConfig?.initialDelayMs ?? 1000,
          },
        }
      );
    }
  }

  getConfigById(id: string): Promise<WebhookConfig | null> {
    return this.webhookRepository.findOne({ where: { id } });
  }

  static signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
