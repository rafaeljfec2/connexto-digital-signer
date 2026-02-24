import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { WebhooksService, WebhookPayload } from '../services/webhooks.service';

interface WebhookJobPayload {
  webhookConfigId: string;
  payload: WebhookPayload;
}

@Injectable()
@Processor('webhooks')
export class WebhookProcessor {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Process('deliver')
  async handleDeliver(job: Job<WebhookJobPayload>): Promise<void> {
    const { webhookConfigId, payload } = job.data;
    const config = await this.webhooksService.getConfigById(webhookConfigId);
    if (!config?.isActive) return;

    const body = JSON.stringify(payload);
    const signature = WebhooksService.signPayload(body, config.secret);
    const start = Date.now();

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': payload.event,
        },
        body,
        signal: AbortSignal.timeout(30000),
      });

      const duration = Date.now() - start;
      const responseBody = await response.text().catch(() => null);

      await this.webhooksService.saveDeliveryLog({
        webhookConfigId,
        event: payload.event,
        payload,
        statusCode: response.status,
        responseBody,
        duration,
        success: response.ok,
        error: response.ok ? null : `HTTP ${response.status}`,
        attemptNumber: job.attemptsMade + 1,
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (!errorMessage.startsWith('Webhook delivery failed:')) {
        await this.webhooksService.saveDeliveryLog({
          webhookConfigId,
          event: payload.event,
          payload,
          statusCode: null,
          responseBody: null,
          duration,
          success: false,
          error: errorMessage,
          attemptNumber: job.attemptsMade + 1,
        });
      }

      throw err;
    }
  }
}
