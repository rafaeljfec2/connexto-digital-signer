import { Injectable } from '@nestjs/common';
import type { EmailClient, SendEmailInput, SendEmailResult } from './email-client';

export interface CapturedEmail extends SendEmailInput {
  readonly sentAt: Date;
}

@Injectable()
export class InMemoryEmailClient implements EmailClient {
  private readonly outbox: CapturedEmail[] = [];

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.outbox.push({ ...input, sentAt: new Date() });
    return { id: `inmemory-${this.outbox.length}`, accepted: true };
  }

  list(): readonly CapturedEmail[] {
    return [...this.outbox];
  }

  last(): CapturedEmail | undefined {
    return this.outbox[this.outbox.length - 1];
  }

  clear(): void {
    this.outbox.length = 0;
  }
}
