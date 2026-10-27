import { Injectable, Logger } from '@nestjs/common';
import type { EmailClient, SendEmailInput, SendEmailResult } from './email-client';

@Injectable()
export class LoggerEmailClient implements EmailClient {
  private readonly logger = new Logger(LoggerEmailClient.name);

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.warn(
      `[email:logger] SIMULATED SEND to=${input.to.email} subject="${input.subject}" textLen=${input.text.length} htmlLen=${input.html.length} tags=${(input.tags ?? []).join(',')}`,
    );
    return { id: null, accepted: true };
  }
}
