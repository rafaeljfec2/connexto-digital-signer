import { Injectable, Logger } from '@nestjs/common';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import type { EmailClient, SendEmailInput, SendEmailResult } from './email-client';

export interface MailerSendEmailClientOptions {
  readonly apiKey: string;
  readonly fromEmail: string;
  readonly fromName: string;
}

interface MailerSendApiResponse {
  readonly statusCode?: number;
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
  readonly body?: unknown;
}

const extractMessageId = (response: MailerSendApiResponse): string | null => {
  const headers = response.headers ?? {};
  const raw = headers['x-message-id'] ?? headers['X-Message-Id'];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] ?? null;
  return null;
};

@Injectable()
export class MailerSendEmailClient implements EmailClient {
  private readonly logger = new Logger(MailerSendEmailClient.name);
  private readonly client: MailerSend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(options: MailerSendEmailClientOptions) {
    if (!options.apiKey) {
      throw new Error('MAILERSEND_API_KEY is required for MailerSendEmailClient');
    }
    this.client = new MailerSend({ apiKey: options.apiKey });
    this.fromEmail = options.fromEmail;
    this.fromName = options.fromName;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const sender = new Sender(this.fromEmail, input.fromName ?? this.fromName);
    const recipient = new Recipient(input.to.email, input.to.name ?? '');
    const params = new EmailParams()
      .setFrom(sender)
      .setTo([recipient])
      .setSubject(input.subject)
      .setHtml(input.html)
      .setText(input.text);
    if (input.tags && input.tags.length > 0) {
      params.setTags([...input.tags]);
    }

    try {
      const response = (await this.client.email.send(params)) as MailerSendApiResponse;
      const status = response.statusCode ?? 0;
      const accepted = status >= 200 && status < 300;
      if (!accepted) {
        this.logger.error(
          `MailerSend rejected email to=${input.to.email} status=${status} body=${JSON.stringify(response.body)}`,
        );
      }
      return { id: extractMessageId(response), accepted };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`MailerSend send failed to=${input.to.email} error=${message}`);
      throw error instanceof Error ? error : new Error(`MailerSend send failed: ${String(error)}`);
    }
  }
}
