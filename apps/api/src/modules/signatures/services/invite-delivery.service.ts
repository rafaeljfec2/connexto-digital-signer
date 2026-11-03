import { createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
  OBSERVED_INVITE_DELIVERY_TRIGGERS,
  type SignerInviteDeliveryDto,
} from '../interfaces/invite-delivery.interface';
import { STALE_INVITE_DELIVERY_QUEUED_MS } from './invite-delivery.constants';
import {
  sanitizeDeliveryErrorForLog,
  sanitizeDeliveryErrorForStorage,
} from './invite-delivery-sanitize';
import { buildSignerInviteDelivery } from './invite-delivery.mapper';

export type ExecuteInviteDeliveryParams = Readonly<{
  tenantId: string;
  envelopeId: string;
  signerId: string;
  trigger: InviteDeliveryTrigger;
}>;

export type ExecuteInviteDeliveryResult = Readonly<{
  attemptNumber: number;
}>;

type QueuedAttemptRef = Readonly<{
  id: string;
  attemptNumber: number;
}>;

@Injectable()
export class InviteDeliveryService {
  private readonly logger = new Logger(InviteDeliveryService.name);

  constructor(
    @InjectRepository(SignerInviteDeliveryAttempt)
    private readonly attemptRepository: Repository<SignerInviteDeliveryAttempt>,
  ) {}

  async findByEnvelope(
    envelopeId: string,
    tenantId: string,
  ): Promise<ReadonlyMap<string, SignerInviteDeliveryDto>> {
    const rows = await this.attemptRepository.find({
      where: { envelopeId, tenantId },
      order: { signerId: 'ASC', attemptNumber: 'ASC' },
    });

    const bySigner = new Map<string, SignerInviteDeliveryAttempt[]>();
    for (const row of rows) {
      const existing = bySigner.get(row.signerId) ?? [];
      existing.push(row);
      bySigner.set(row.signerId, existing);
    }

    const result = new Map<string, SignerInviteDeliveryDto>();
    for (const [signerId, signerRows] of bySigner) {
      result.set(signerId, buildSignerInviteDelivery(signerRows));
    }
    return result;
  }

  async executeInviteDelivery(
    params: ExecuteInviteDeliveryParams,
    send: () => Promise<string>,
  ): Promise<ExecuteInviteDeliveryResult> {
    if (!OBSERVED_INVITE_DELIVERY_TRIGGERS.has(params.trigger)) {
      throw new Error(`Unsupported invite delivery trigger: ${params.trigger}`);
    }

    const queued = await this.beginQueuedAttempt(params);

    this.logStructured('invite_delivery.attempt_started', {
      tenantId: params.tenantId,
      envelopeId: params.envelopeId,
      signerId: params.signerId,
      attemptNumber: queued.attemptNumber,
      trigger: params.trigger,
    });

    try {
      const providerMessageId = await send();
      const finishedAt = new Date();
      await this.attemptRepository.update(queued.id, {
        status: InviteDeliveryStatus.SENT,
        finishedAt,
        providerMessageId: providerMessageId === '' ? null : providerMessageId,
        errorMessage: null,
      });

      this.logStructured('invite_delivery.attempt_sent', {
        tenantId: params.tenantId,
        envelopeId: params.envelopeId,
        signerId: params.signerId,
        attemptNumber: queued.attemptNumber,
        trigger: params.trigger,
        providerMessageId: providerMessageId === '' ? null : providerMessageId,
      });

      return { attemptNumber: queued.attemptNumber };
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage = sanitizeDeliveryErrorForStorage(error);
      await this.attemptRepository.update(queued.id, {
        status: InviteDeliveryStatus.FAILED,
        finishedAt,
        errorMessage,
      });

      this.logStructured('invite_delivery.attempt_failed', {
        tenantId: params.tenantId,
        envelopeId: params.envelopeId,
        signerId: params.signerId,
        attemptNumber: queued.attemptNumber,
        trigger: params.trigger,
        errorMessage: sanitizeDeliveryErrorForLog(error),
      });

      throw error;
    }
  }

  private async beginQueuedAttempt(
    params: ExecuteInviteDeliveryParams,
  ): Promise<QueuedAttemptRef> {
    return this.attemptRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(SignerInviteDeliveryAttempt);
      await this.acquireSignerDeliveryLock(manager, params.signerId);
      await this.expireStaleQueuedAttempts(repo, params.signerId, params.tenantId);

      const pendingQueued = await repo.findOne({
        where: {
          signerId: params.signerId,
          tenantId: params.tenantId,
          status: InviteDeliveryStatus.QUEUED,
        },
      });
      if (
        pendingQueued !== null &&
        OBSERVED_INVITE_DELIVERY_TRIGGERS.has(pendingQueued.trigger)
      ) {
        throw new ConflictException('An invite delivery attempt is already in progress');
      }

      const attemptNumber = await this.allocateAttemptNumber(
        repo,
        params.signerId,
        params.tenantId,
      );
      const startedAt = new Date();
      const attempt = await repo.save({
        tenantId: params.tenantId,
        envelopeId: params.envelopeId,
        signerId: params.signerId,
        attemptNumber,
        trigger: params.trigger,
        status: InviteDeliveryStatus.QUEUED,
        startedAt,
        finishedAt: null,
        errorMessage: null,
        providerMessageId: null,
      });

      return { id: attempt.id, attemptNumber: attempt.attemptNumber };
    });
  }

  private async acquireSignerDeliveryLock(
    manager: EntityManager,
    signerId: string,
  ): Promise<void> {
    const digest = createHash('sha256').update(signerId).digest();
    const lockHigh = digest.readInt32BE(0);
    const lockLow = digest.readInt32BE(4);
    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [lockHigh, lockLow]);
  }

  private async expireStaleQueuedAttempts(
    repo: Repository<SignerInviteDeliveryAttempt>,
    signerId: string,
    tenantId: string,
  ): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_INVITE_DELIVERY_QUEUED_MS);
    const staleRows = await repo
      .createQueryBuilder('attempt')
      .where('attempt.signer_id = :signerId', { signerId })
      .andWhere('attempt.tenant_id = :tenantId', { tenantId })
      .andWhere('attempt.status = :status', { status: InviteDeliveryStatus.QUEUED })
      .andWhere('attempt.started_at < :cutoff', { cutoff })
      .getMany();

    if (staleRows.length === 0) {
      return;
    }

    const finishedAt = new Date();
    for (const row of staleRows) {
      if (!OBSERVED_INVITE_DELIVERY_TRIGGERS.has(row.trigger)) {
        continue;
      }
      await repo.update(row.id, {
        status: InviteDeliveryStatus.FAILED,
        finishedAt,
        errorMessage: 'Delivery attempt timed out before completion',
      });
      this.logStructured('invite_delivery.attempt_stale_expired', {
        tenantId: row.tenantId,
        envelopeId: row.envelopeId,
        signerId: row.signerId,
        attemptNumber: row.attemptNumber,
        trigger: row.trigger,
      });
    }
  }

  private async allocateAttemptNumber(
    repo: Repository<SignerInviteDeliveryAttempt>,
    signerId: string,
    tenantId: string,
  ): Promise<number> {
    const raw = await repo
      .createQueryBuilder('attempt')
      .select('MAX(attempt.attempt_number)', 'max')
      .where('attempt.signer_id = :signerId', { signerId })
      .andWhere('attempt.tenant_id = :tenantId', { tenantId })
      .getRawOne<{ max: string | null }>();

    const currentMax =
      raw?.max === null || raw?.max === undefined ? 0 : Number.parseInt(raw.max, 10);
    return currentMax + 1;
  }

  private logStructured(
    event: string,
    fields: Readonly<Record<string, string | number | null>>,
  ): void {
    this.logger.log(JSON.stringify({ event, ...fields }));
  }
}
