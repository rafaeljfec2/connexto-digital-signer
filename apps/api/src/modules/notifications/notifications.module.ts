import '../../common/config/load-local-env';
import { Logger, Module, type Provider } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/entities/document.entity';
import { Envelope } from '../envelopes/entities/envelope.entity';
import { Signer } from '../signatures/entities/signer.entity';
import { User } from '../users/entities/user.entity';
import { isSchedulerEnabled } from '../../shared/scheduler/is-scheduler-enabled';
import { EMAIL_CLIENT } from './channels/email/email-client';
import { createEmailClientFromEnv } from './channels/email/email-driver';
import { NotificationsService } from './services/notifications.service';
import { TemplateService } from './services/template.service';
import { ReminderSchedulerService } from './services/reminder-scheduler.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationEventsHandler } from './events/notification.events-handler';

function buildSchedulerProviders(): Provider[] {
  if (!isSchedulerEnabled()) {
    return [];
  }
  return [
    ReminderSchedulerService,
    {
      provide: 'ReminderSchedulerLogger',
      useValue: new Logger(ReminderSchedulerService.name),
    },
  ];
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Envelope, Signer, User]),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
  ],
  providers: [
    TemplateService,
    NotificationsService,
    EmailProcessor,
    NotificationEventsHandler,
    {
      provide: EMAIL_CLIENT,
      useFactory: createEmailClientFromEnv,
    },
    {
      provide: 'NotificationEventsLogger',
      useValue: new Logger(NotificationEventsHandler.name),
    },
    {
      provide: 'EmailProcessorLogger',
      useValue: new Logger(EmailProcessor.name),
    },
    ...buildSchedulerProviders(),
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
