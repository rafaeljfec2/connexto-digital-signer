import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, Repository } from 'typeorm';
import {
  EVENT_DOCUMENT_EXPIRED,
  type DocumentExpiredEvent,
} from '@connexto/events';
import { Envelope, EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { Signer, SignerStatus } from '../../signatures/entities/signer.entity';
import {
  CRON_LOCK_KEYS,
  CRON_LOCK_TTL_MS,
} from '../../../shared/distributed-lock/distributed-lock.constants';
import { DistributedLockService } from '../../../shared/distributed-lock/distributed-lock.service';
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
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly notificationsService: NotificationsService,
    private readonly lockService: DistributedLockService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ReminderSchedulerLogger') private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders(): Promise<void> {
    await this.withCronLock(CRON_LOCK_KEYS.reminders, () => this.runReminders());
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredEnvelopes(): Promise<void> {
    await this.withCronLock(CRON_LOCK_KEYS.expiredEnvelopes, () =>
      this.runExpiredEnvelopes(),
    );
  }

  async runReminders(): Promise<void> {
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

  async runExpiredEnvelopes(): Promise<void> {
    this.logger.log('Checking for expired envelopes...');

    const now = new Date();
    const envelopes = await this.envelopeRepository.find({
      where: {
        status: EnvelopeStatus.PENDING_SIGNATURES,
        expiresAt: LessThanOrEqual(now),
      },
    });

    for (const envelope of envelopes) {
      await this.processExpiredEnvelope(envelope, now);
    }

    this.logger.log('Expired envelopes check completed.');
  }

  private async withCronLock(
    key: string,
    run: () => Promise<void>,
  ): Promise<void> {
    let token: string | null;
    try {
      token = await this.lockService.acquire(key, CRON_LOCK_TTL_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cron lock acquire failed for ${key}: ${message}`);
      return;
    }

    if (token === null) {
      this.logger.log(`Skipping cron; lock not acquired: ${key}`);
      return;
    }

    try {
      await run();
    } finally {
      await this.lockService.release(key, token);
    }
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
      if (!this.isReminderEligible(signer, envelope, signers)) {
        continue;
      }
      await this.sendReminderIfDue(signer, envelope, intervalMs, now);
    }
  }

  private isReminderEligible(
    signer: Signer,
    envelope: Envelope,
    pendingSigners: Signer[],
  ): boolean {
    if (signer.notifiedAt === null) {
      return false;
    }
    if (envelope.signingMode !== SigningMode.SEQUENTIAL) {
      return true;
    }
    const sorted = [...pendingSigners].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    return sorted[0]?.id === signer.id;
  }

  private async sendReminderIfDue(
    signer: Signer,
    envelope: Envelope,
    intervalMs: number,
    now: number,
  ): Promise<void> {
    if (signer.reminderCount >= MAX_REMINDERS) return;
    if (signer.notifiedAt === null) return;

    const lastNotified = signer.notifiedAt.getTime();
    if (now - lastNotified < intervalMs) return;

    const nextCount = signer.reminderCount + 1;
    const claim = await this.signerRepository.update(
      {
        id: signer.id,
        tenantId: envelope.tenantId,
        reminderCount: signer.reminderCount,
        status: SignerStatus.PENDING,
      },
      {
        reminderCount: nextCount,
        notifiedAt: new Date(),
      },
    );

    if (claim.affected !== 1) {
      return;
    }

    try {
      const signUrl = this.buildSignUrl(signer.accessToken, envelope.signingLanguage ?? 'en');

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

      this.logger.log(
        `Reminder ${nextCount}/${MAX_REMINDERS} sent to ${signer.email} for envelope ${envelope.id}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send reminder to ${signer.email} after claim: ${message}`,
      );
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

    const newStatus = EnvelopeStatus.EXPIRED;
    const docStatus = DocumentStatus.EXPIRED;

    const claimed = await this.envelopeRepository.manager.transaction(
      async (manager) => {
        const claim = await manager.update(
          Envelope,
          {
            id: envelope.id,
            tenantId: envelope.tenantId,
            status: EnvelopeStatus.PENDING_SIGNATURES,
            expiresAt: LessThanOrEqual(now),
          },
          { status: newStatus },
        );

        if (claim.affected !== 1) {
          return false;
        }

        await manager.update(
          Document,
          { envelopeId: envelope.id, tenantId: envelope.tenantId },
          { status: docStatus },
        );
        return true;
      },
    );

    if (!claimed) {
      return;
    }

    await this.emitExpiredDocumentEvents(envelope);

    this.logger.log(
      `Envelope ${envelope.id} expired - marking as ${newStatus} (${signedSigners.length} signatures).`,
    );
  }

  private async emitExpiredDocumentEvents(envelope: Envelope): Promise<void> {
    const documents = await this.documentRepository.find({
      where: {
        envelopeId: envelope.id,
        tenantId: envelope.tenantId,
        status: DocumentStatus.EXPIRED,
      },
    });
    const expiredAt = new Date();
    for (const document of documents) {
      const payload: DocumentExpiredEvent = {
        documentId: document.id,
        tenantId: document.tenantId,
        expiredAt,
      };
      this.eventEmitter.emit(EVENT_DOCUMENT_EXPIRED, payload);
    }
  }

  private buildSignUrl(accessToken: string, locale = 'pt-br'): string {
    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3001';
    return `${baseUrl}/${locale}/sign/${accessToken}`;
  }
}
