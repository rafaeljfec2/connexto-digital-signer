import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WebhookConfig } from './entities/webhook-config.entity';
import { WebhooksController } from './controllers/webhooks.controller';
import { WebhooksService } from './services/webhooks.service';
import { WebhookProcessor } from './processors/webhook.processor';
import { WebhookEventsHandler } from './events/webhook.events-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookConfig]),
    BullModule.registerQueue({
      name: 'webhooks',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookProcessor, WebhookEventsHandler],
  exports: [WebhooksService],
})
export class WebhooksModule {}
