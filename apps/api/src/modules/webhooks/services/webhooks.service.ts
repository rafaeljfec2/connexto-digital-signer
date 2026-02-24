import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHmac } from 'node:crypto';
import { WebhookConfig } from '../entities/webhook-config.entity';
import { WebhookDeliveryLog } from '../entities/webhook-delivery-log.entity';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from '../dto/update-webhook-config.dto';

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
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepository: Repository<WebhookDeliveryLog>,
    @InjectQueue('webhooks')
    private readonly queue: Queue,
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

  async findOneByTenant(id: string, tenantId: string): Promise<WebhookConfig> {
    const config = await this.webhookRepository.findOne({
      where: { id, tenantId },
    });
    if (config === null) {
      throw new NotFoundException('Webhook config not found');
    }
    return config;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateWebhookConfigDto,
  ): Promise<WebhookConfig> {
    const config = await this.findOneByTenant(id, tenantId);
    if (dto.url !== undefined) config.url = dto.url;
    if (dto.events !== undefined) config.events = dto.events;
    if (dto.isActive !== undefined) config.isActive = dto.isActive;
    if (dto.retryConfig !== undefined) config.retryConfig = dto.retryConfig;
    return this.webhookRepository.save(config);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const config = await this.findOneByTenant(id, tenantId);
    config.isActive = false;
    await this.webhookRepository.save(config);
  }

  async sendTestPing(id: string, tenantId: string): Promise<{ success: boolean; statusCode: number | null }> {
    const config = await this.findOneByTenant(id, tenantId);
    const payload: WebhookPayload = {
      event: 'ping',
      tenantId,
      timestamp: new Date().toISOString(),
      data: { message: 'Test ping from Digital Signer' },
    };

    const body = JSON.stringify(payload);
    const signature = WebhooksService.signPayload(body, config.secret);
    const start = Date.now();

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': 'ping',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const duration = Date.now() - start;
      const responseBody = await response.text().catch(() => null);

      await this.saveDeliveryLog({
        webhookConfigId: id,
        event: 'ping',
        payload,
        statusCode: response.status,
        responseBody,
        duration,
        success: response.ok,
        error: response.ok ? null : `HTTP ${response.status}`,
        attemptNumber: 1,
      });

      return { success: response.ok, statusCode: response.status };
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await this.saveDeliveryLog({
        webhookConfigId: id,
        event: 'ping',
        payload,
        statusCode: null,
        responseBody: null,
        duration,
        success: false,
        error: errorMessage,
        attemptNumber: 1,
      });

      return { success: false, statusCode: null };
    }
  }

  async findDeliveries(
    configId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: WebhookDeliveryLog[]; total: number }> {
    await this.findOneByTenant(configId, tenantId);
    const [data, total] = await this.deliveryLogRepository.findAndCount({
      where: { webhookConfigId: configId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async retryDelivery(deliveryId: string, tenantId: string): Promise<void> {
    const log = await this.deliveryLogRepository.findOne({
      where: { id: deliveryId },
    });
    if (log === null) {
      throw new NotFoundException('Delivery log not found');
    }

    const config = await this.findOneByTenant(log.webhookConfigId, tenantId);
    if (!config.isActive) {
      throw new NotFoundException('Webhook config is inactive');
    }

    await this.queue.add(
      'deliver',
      { webhookConfigId: config.id, payload: log.payload },
      {
        attempts: config.retryConfig?.maxAttempts ?? 3,
        backoff: {
          type: 'exponential',
          delay: config.retryConfig?.initialDelayMs ?? 1000,
        },
      },
    );
  }

  async saveDeliveryLog(
    data: Omit<WebhookDeliveryLog, 'id' | 'createdAt'>,
  ): Promise<WebhookDeliveryLog> {
    const log = this.deliveryLogRepository.create(data);
    return this.deliveryLogRepository.save(log);
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
        },
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
