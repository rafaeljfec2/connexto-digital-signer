import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TemplateService } from './template.service';

export interface SendEmailJobPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  senderName?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications')
    private readonly queue: Queue,
    private readonly templateService: TemplateService,
  ) {}

  async sendEmail(payload: SendEmailJobPayload): Promise<string> {
    const job = await this.queue.add('email', payload);
    return job.id === undefined ? '' : String(job.id);
  }

  async sendSignatureInvite(params: {
    tenantId: string;
    signerEmail: string;
    signerName: string;
    documentTitle: string;
    signUrl: string;
    locale?: string;
    message?: string;
    senderName?: string;
  }): Promise<string> {
    const { subject, text, html } = this.templateService.renderTemplate(
      'signature-invite',
      {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        signUrl: params.signUrl,
        message: params.message,
      },
      params.locale ?? 'en',
    );

    return this.sendEmail({ to: params.signerEmail, subject, text, html, senderName: params.senderName });
  }

  async sendSignatureReminder(params: {
    tenantId: string;
    signerEmail: string;
    signerName: string;
    documentTitle: string;
    signUrl: string;
    reminderCount: number;
    maxReminders: number;
    locale?: string;
    senderName?: string;
  }): Promise<string> {
    const { subject, text, html } = this.templateService.renderTemplate(
      'signature-reminder',
      {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        signUrl: params.signUrl,
        reminderCount: params.reminderCount,
        maxReminders: params.maxReminders,
      },
      params.locale ?? 'en',
    );

    return this.sendEmail({ to: params.signerEmail, subject, text, html, senderName: params.senderName });
  }

  async sendDocumentCompleted(params: {
    ownerEmail: string;
    ownerName: string;
    documentTitle: string;
    documentUrl: string;
    locale?: string;
  }): Promise<string> {
    const { subject, text, html } = this.templateService.renderTemplate(
      'document-completed',
      {
        ownerName: params.ownerName,
        documentTitle: params.documentTitle,
        documentUrl: params.documentUrl,
      },
      params.locale ?? 'en',
    );

    return this.sendEmail({ to: params.ownerEmail, subject, text, html });
  }

  async sendWelcome(params: {
    ownerEmail: string;
    ownerName: string;
    dashboardUrl: string;
    locale?: string;
  }): Promise<string> {
    const { subject, text, html } = this.templateService.renderTemplate(
      'welcome',
      {
        ownerName: params.ownerName,
        dashboardUrl: params.dashboardUrl,
      },
      params.locale ?? 'en',
    );

    return this.sendEmail({ to: params.ownerEmail, subject, text, html });
  }

  async sendVerificationCode(params: {
    signerEmail: string;
    signerName: string;
    documentTitle: string;
    code: string;
    locale?: string;
  }): Promise<string> {
    const { subject, text, html } = this.templateService.renderTemplate(
      'verification-code',
      {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        code: params.code,
      },
      params.locale ?? 'en',
    );

    return this.sendEmail({ to: params.signerEmail, subject, text, html });
  }

  buildSignatureInvite(params: {
    signerName: string;
    documentTitle: string;
    signUrl: string;
    locale?: string;
    message?: string;
  }): { subject: string; body: string } {
    const { subject, text } = this.templateService.renderTemplate(
      'signature-invite',
      {
        signerName: params.signerName,
        documentTitle: params.documentTitle,
        signUrl: params.signUrl,
        message: params.message,
      },
      params.locale ?? 'en',
    );

    return { subject, body: text };
  }
}
