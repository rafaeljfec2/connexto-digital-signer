import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import type { Transporter } from 'nodemailer';
import type { SendEmailJobPayload } from '../services/notifications.service';

@Processor('notifications')
export class EmailProcessor {
  private transporter: Transporter | null = null;

  constructor(@Inject('EmailProcessorLogger') private readonly logger: Logger) {}

  @Process('email')
  async handleEmail(job: Job<SendEmailJobPayload>): Promise<void> {
    const { to, subject, text, html, senderName } = job.data;

    if (process.env['SMTP_HOST']) {
      await this.sendViaSmtp(to, subject, text, html, senderName);
    } else {
      this.logger.log(`[Email] To: ${to}, Subject: ${subject}\n${text}`);
    }
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const { createTransport } = await import('nodemailer');

    this.transporter = createTransport({
      host: process.env['SMTP_HOST'],
      port: Number.parseInt(process.env['SMTP_PORT'] ?? '587', 10),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth:
        process.env['SMTP_USER'] && process.env['SMTP_PASS']
          ? {
              user: process.env['SMTP_USER'],
              pass: process.env['SMTP_PASS'],
            }
          : undefined,
    });

    return this.transporter;
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    text: string,
    html?: string,
    senderName?: string,
  ): Promise<void> {
    const transporter = await this.getTransporter();
    const fromAddress = process.env['SMTP_FROM'] ?? 'noreply@localhost';
    const from = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });

    this.logger.log(`Email sent to ${to}: ${subject}`);
  }
}
