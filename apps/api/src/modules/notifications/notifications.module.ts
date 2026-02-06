import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './services/notifications.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationEventsHandler } from './events/notification.events-handler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  providers: [NotificationsService, EmailProcessor, NotificationEventsHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
