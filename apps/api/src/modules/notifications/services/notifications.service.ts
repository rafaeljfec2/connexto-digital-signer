import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { renderTemplate } from './template.service';

export interface SendEmailJobPayload {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications')
    private readonly queue: Queue
  ) {}

  async sendEmail(payload: SendEmailJobPayload): Promise<string> {
    const job = await this.queue.add('email', payload);
    return job.id !== undefined ? String(job.id) : '';
  }

  async sendSignatureInvite(params: {
    tenantId: string;
    signerEmail: string;
    signerName: string;
    documentTitle: string;
    signUrl: string;
    message?: string;
  }): Promise<string> {
    const subject = `You are invited to sign: ${params.documentTitle}`;
    return this.sendEmail({
      to: params.signerEmail,
      subject,
      template: 'signature-invite',
      context: {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        signUrl: params.signUrl,
        message: params.message,
      },
    });
  }

  buildSignatureInvite(params: {
    signerName: string;
    documentTitle: string;
    signUrl: string;
    message?: string;
  }): { subject: string; body: string } {
    const subject = `You are invited to sign: ${params.documentTitle}`;
    const body = renderTemplate('signature-invite', {
      signerName: params.signerName,
      documentTitle: params.documentTitle,
      signUrl: params.signUrl,
      message: params.message,
    });
    return { subject, body };
  }
}
