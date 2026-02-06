import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookConfig } from '../entities/webhook-config.entity';
import { WebhooksService, WebhookPayload } from '../services/webhooks.service';

interface WebhookJobPayload {
  webhookConfigId: string;
  payload: WebhookPayload;
}

@Injectable()
@Processor('webhooks')
export class WebhookProcessor {
  constructor(
    @InjectRepository(WebhookConfig)
    private readonly webhookRepository: Repository<WebhookConfig>
  ) {}

  @Process('deliver')
  async handleDeliver(job: Job<WebhookJobPayload>): Promise<void> {
    const { webhookConfigId, payload } = job.data;
    const config = await this.webhookRepository.findOne({
      where: { id: webhookConfigId },
    });
    if (config === null || !config.isActive) return;
    const body = JSON.stringify(payload);
    const signature = WebhooksService.signPayload(
      body,
      config.secret
    );
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`);
    }
  }
}
