import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { renderTemplate } from '../services/template.service';
import type { SendEmailJobPayload } from '../services/notifications.service';

@Processor('notifications')
export class EmailProcessor {
  @Process('email')
  async handleEmail(job: Job<SendEmailJobPayload>): Promise<void> {
    const { to, subject, template, context } = job.data;
    const body = renderTemplate(template, context);
    if (process.env['SMTP_HOST']) {
      await this.sendViaSmtp(to, subject, body);
    } else {
      console.log(`[Email] To: ${to}, Subject: ${subject}\n${body}`);
    }
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    body: string
  ): Promise<void> {
    const { createTransport } = await import('nodemailer');
    const transporter = createTransport({
      host: process.env['SMTP_HOST'],
      port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth:
        process.env['SMTP_USER'] && process.env['SMTP_PASS']
          ? {
              user: process.env['SMTP_USER'],
              pass: process.env['SMTP_PASS'],
            }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env['SMTP_FROM'] ?? 'noreply@localhost',
      to,
      subject,
      text: body,
    });
  }
}
