import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Envelope, EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { Signer, SignerStatus } from '../../signatures/entities/signer.entity';
import { NotificationsService } from './notifications.service';

const INTERVAL_MS: Record<string, number> = {
  '1_day': 24 * 60 * 60 * 1000,
  '2_days': 2 * 24 * 60 * 60 * 1000,
  '3_days': 3 * 24 * 60 * 60 * 1000,
  '7_days': 7 * 24 * 60 * 60 * 1000,
};

const MAX_REMINDERS = 3;

@Injectable()
export class ReminderSchedulerService {
  constructor(
    @InjectRepository(Envelope)
    private readonly envelopeRepository: Repository<Envelope>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly notificationsService: NotificationsService,
    @Inject('ReminderSchedulerLogger') private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders(): Promise<void> {
    this.logger.log('Running reminder scheduler...');

    const envelopes = await this.envelopeRepository.find({
      where: {
        status: EnvelopeStatus.PENDING_SIGNATURES,
        reminderInterval: Not('none'),
      },
    });

    for (const envelope of envelopes) {
      await this.processEnvelopeReminders(envelope);
    }

    this.logger.log('Reminder scheduler completed.');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredEnvelopes(): Promise<void> {
    this.logger.log('Checking for expired envelopes...');

    const envelopes = await this.envelopeRepository.find({
      where: { status: EnvelopeStatus.PENDING_SIGNATURES },
    });

    const now = new Date();

    for (const envelope of envelopes) {
      await this.processExpiredEnvelope(envelope, now);
    }

    this.logger.log('Expired envelopes check completed.');
  }

  private async processEnvelopeReminders(envelope: Envelope): Promise<void> {
    const intervalMs = INTERVAL_MS[envelope.reminderInterval];
    if (!intervalMs) return;

    const signers = await this.signerRepository.find({
      where: {
        envelopeId: envelope.id,
        tenantId: envelope.tenantId,
        status: SignerStatus.PENDING,
      },
    });

    const now = Date.now();

    for (const signer of signers) {
      await this.sendReminderIfDue(signer, envelope, intervalMs, now);
    }
  }

  private async sendReminderIfDue(
    signer: Signer,
    envelope: Envelope,
    intervalMs: number,
    now: number,
  ): Promise<void> {
    if (signer.reminderCount >= MAX_REMINDERS) return;

    const lastNotified = signer.notifiedAt ? signer.notifiedAt.getTime() : 0;
    if (now - lastNotified < intervalMs) return;

    try {
      const signUrl = this.buildSignUrl(signer.accessToken, envelope.signingLanguage ?? 'en');
      const nextCount = signer.reminderCount + 1;

      await this.notificationsService.sendSignatureReminder({
        tenantId: envelope.tenantId,
        signerEmail: signer.email,
        signerName: signer.name,
        documentTitle: envelope.title,
        signUrl,
        reminderCount: nextCount,
        maxReminders: MAX_REMINDERS,
        locale: envelope.signingLanguage ?? 'en',
      });

      signer.notifiedAt = new Date();
      signer.reminderCount = nextCount;
      await this.signerRepository.save(signer);

      this.logger.log(
        `Reminder ${signer.reminderCount}/${MAX_REMINDERS} sent to ${signer.email} for envelope ${envelope.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send reminder to ${signer.email}: ${message}`);
    }
  }

  private async processExpiredEnvelope(envelope: Envelope, now: Date): Promise<void> {
    if (envelope.expiresAt === null || envelope.expiresAt > now) return;

    const signedSigners = await this.signerRepository.find({
      where: {
        envelopeId: envelope.id,
        tenantId: envelope.tenantId,
        status: SignerStatus.SIGNED,
      },
    });

    const newStatus = signedSigners.length > 0
      ? EnvelopeStatus.COMPLETED
      : EnvelopeStatus.EXPIRED;

    envelope.status = newStatus;
    await this.envelopeRepository.save(envelope);

    const documents = await this.documentRepository.find({
      where: { envelopeId: envelope.id, tenantId: envelope.tenantId },
    });

    const docStatus = newStatus === EnvelopeStatus.COMPLETED
      ? DocumentStatus.COMPLETED
      : DocumentStatus.EXPIRED;

    for (const doc of documents) {
      doc.status = docStatus;
      await this.documentRepository.save(doc);
    }

    this.logger.log(
      `Envelope ${envelope.id} expired - marking as ${newStatus} (${signedSigners.length} signatures).`,
    );
  }

  private buildSignUrl(accessToken: string, locale = 'pt-br'): string {
    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3001';
    return `${baseUrl}/${locale}/sign/${accessToken}`;
  }
}
