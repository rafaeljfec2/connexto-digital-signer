import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
  }): Promise<string> {
    return this.sendEmail({
      to: params.signerEmail,
      subject: `You are invited to sign: ${params.documentTitle}`,
      template: 'signature-invite',
      context: {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        signUrl: params.signUrl,
      },
    });
  }
}
