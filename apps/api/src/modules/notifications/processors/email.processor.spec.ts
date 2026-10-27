import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailProcessor } from './email.processor';
import { InMemoryEmailClient } from '../channels/email/in-memory-email.client';
import { EMAIL_CLIENT } from '../channels/email/email-client';
import type { SendEmailJobPayload } from '../services/notifications.service';

describe('EmailProcessor', () => {
  it('should treat jobs without channel as email and deliver via EmailClient', async () => {
    const emailClient = new InMemoryEmailClient();
    const processor = new EmailProcessor(new Logger('EmailProcessorTest'), emailClient);

    const job = {
      data: {
        to: 'signer@example.com',
        subject: 'Please sign',
        text: 'Sign here',
        html: '<p>Sign here</p>',
        senderName: 'Acme',
      },
    } as unknown as Job<SendEmailJobPayload>;

    await processor.handleEmail(job);

    const last = emailClient.last();
    expect(last).toBeDefined();
    expect(last?.to.email).toBe('signer@example.com');
    expect(last?.subject).toBe('Please sign');
    expect(last?.text).toBe('Sign here');
    expect(last?.html).toBe('<p>Sign here</p>');
    expect(last?.fromName).toBe('Acme');
  });

  it('should deliver explicit email channel jobs', async () => {
    const emailClient = new InMemoryEmailClient();
    const processor = new EmailProcessor(new Logger('EmailProcessorTest'), emailClient);

    const job = {
      data: {
        channel: 'email' as const,
        to: 'a@b.com',
        subject: 'S',
        text: 'T',
        html: '<p>T</p>',
      },
    } as unknown as Job<SendEmailJobPayload>;

    await processor.handleEmail(job);

    expect(emailClient.list()).toHaveLength(1);
    expect(emailClient.last()?.to.email).toBe('a@b.com');
  });

  it('should expose EMAIL_CLIENT token for Nest DI', () => {
    expect(EMAIL_CLIENT).toBeDefined();
  });
});
