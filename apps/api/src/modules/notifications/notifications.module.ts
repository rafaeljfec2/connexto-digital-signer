import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/entities/document.entity';
import { Signer } from '../signatures/entities/signer.entity';
import { NotificationsService } from './services/notifications.service';
import { ReminderSchedulerService } from './services/reminder-scheduler.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationEventsHandler } from './events/notification.events-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Signer]),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  providers: [
    NotificationsService,
    ReminderSchedulerService,
    EmailProcessor,
    NotificationEventsHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
