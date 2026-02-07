import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
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
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders(): Promise<void> {
    this.logger.log('Running reminder scheduler...');

    const documents = await this.documentRepository.find({
      where: {
        status: DocumentStatus.PENDING_SIGNATURES,
        reminderInterval: Not('none'),
      },
    });

    for (const document of documents) {
      await this.processDocumentReminders(document);
    }

    this.logger.log('Reminder scheduler completed.');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredDocuments(): Promise<void> {
    this.logger.log('Checking for expired documents...');

    const documents = await this.documentRepository.find({
      where: { status: DocumentStatus.PENDING_SIGNATURES },
    });

    const now = new Date();

    for (const document of documents) {
      await this.processExpiredDocument(document, now);
    }

    this.logger.log('Expired documents check completed.');
  }

  private async processDocumentReminders(document: Document): Promise<void> {
    const intervalMs = INTERVAL_MS[document.reminderInterval];
    if (!intervalMs) return;

    const signers = await this.signerRepository.find({
      where: {
        documentId: document.id,
        tenantId: document.tenantId,
        status: SignerStatus.PENDING,
      },
    });

    const now = Date.now();

    for (const signer of signers) {
      await this.sendReminderIfDue(signer, document, intervalMs, now);
    }
  }

  private async sendReminderIfDue(
    signer: Signer,
    document: Document,
    intervalMs: number,
    now: number,
  ): Promise<void> {
    if (signer.reminderCount >= MAX_REMINDERS) return;

    const lastNotified = signer.notifiedAt ? signer.notifiedAt.getTime() : 0;
    if (now - lastNotified < intervalMs) return;

    try {
      const signUrl = this.buildSignUrl(signer.accessToken);
      await this.notificationsService.sendSignatureInvite({
        tenantId: document.tenantId,
        signerEmail: signer.email,
        signerName: signer.name,
        documentTitle: document.title,
        signUrl,
      });

      signer.notifiedAt = new Date();
      signer.reminderCount += 1;
      await this.signerRepository.save(signer);

      this.logger.log(
        `Reminder ${signer.reminderCount}/${MAX_REMINDERS} sent to ${signer.email} for document ${document.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send reminder to ${signer.email}: ${message}`);
    }
  }

  private async processExpiredDocument(document: Document, now: Date): Promise<void> {
    if (document.expiresAt === null || document.expiresAt > now) return;

    const signedSigners = await this.signerRepository.find({
      where: {
        documentId: document.id,
        tenantId: document.tenantId,
        status: SignerStatus.SIGNED,
      },
    });

    const newStatus = signedSigners.length > 0
      ? DocumentStatus.COMPLETED
      : DocumentStatus.EXPIRED;

    document.status = newStatus;
    await this.documentRepository.save(document);

    this.logger.log(
      `Document ${document.id} expired - marking as ${newStatus} (${signedSigners.length} signatures).`,
    );
  }

  private buildSignUrl(accessToken: string): string {
    const baseUrl = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
    return `${baseUrl}/sign/${accessToken}`;
  }
}
