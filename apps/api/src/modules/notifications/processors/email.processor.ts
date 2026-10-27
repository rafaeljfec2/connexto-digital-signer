import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import type { EmailClient } from '../channels/email/email-client';
import { EMAIL_CLIENT } from '../channels/email/email-client';
import type { SendEmailJobPayload } from '../services/notifications.service';

@Processor('notifications')
export class EmailProcessor {
  constructor(
    @Inject('EmailProcessorLogger') private readonly logger: Logger,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  @Process('email')
  async handleEmail(job: Job<SendEmailJobPayload>): Promise<void> {
    const channel = job.data.channel ?? 'email';
    if (channel !== 'email') {
      throw new Error(`Unsupported notification channel: ${channel}`);
    }

    const { to, subject, text, html, senderName } = job.data;
    const result = await this.emailClient.send({
      to: { email: to },
      subject,
      text,
      html: html ?? text,
      ...(senderName ? { fromName: senderName } : {}),
    });

    if (!result.accepted) {
      throw new Error(`Email delivery was not accepted for ${to}: ${subject}`);
    }

    this.logger.log(`Email sent to ${to}: ${subject}${result.id ? ` id=${result.id}` : ''}`);
  }
}
