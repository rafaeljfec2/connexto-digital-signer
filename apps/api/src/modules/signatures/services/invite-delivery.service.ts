import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
  OBSERVED_INVITE_DELIVERY_TRIGGERS,
  type SignerInviteDeliveryDto,
} from '../interfaces/invite-delivery.interface';
import { buildSignerInviteDelivery } from './invite-delivery.mapper';

const MAX_ERROR_MESSAGE_LENGTH = 2000;

export type ExecuteInviteDeliveryParams = Readonly<{
  tenantId: string;
  envelopeId: string;
  signerId: string;
  trigger: InviteDeliveryTrigger;
}>;

export type ExecuteInviteDeliveryResult = Readonly<{
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

    const pendingQueued = await this.attemptRepository.findOne({
      where: {
        signerId: params.signerId,
        tenantId: params.tenantId,
        status: InviteDeliveryStatus.QUEUED,
      },
    });
    if (pendingQueued !== null && OBSERVED_INVITE_DELIVERY_TRIGGERS.has(pendingQueued.trigger)) {
      throw new ConflictException('An invite delivery attempt is already in progress');
    }

    const attemptNumber = await this.allocateAttemptNumber(params.signerId, params.tenantId);
    const startedAt = new Date();
    const attempt = await this.attemptRepository.save({
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

    this.logStructured('invite_delivery.attempt_started', {
      tenantId: params.tenantId,
      envelopeId: params.envelopeId,
      signerId: params.signerId,
      attemptNumber,
      trigger: params.trigger,
    });

    try {
      const providerMessageId = await send();
      const finishedAt = new Date();
      await this.attemptRepository.update(attempt.id, {
        status: InviteDeliveryStatus.SENT,
        finishedAt,
        providerMessageId: providerMessageId === '' ? null : providerMessageId,
        errorMessage: null,
      });

      this.logStructured('invite_delivery.attempt_sent', {
        tenantId: params.tenantId,
        envelopeId: params.envelopeId,
        signerId: params.signerId,
        attemptNumber,
        trigger: params.trigger,
        providerMessageId: providerMessageId === '' ? null : providerMessageId,
      });

      return { attemptNumber };
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage = sanitizeDeliveryError(error);
      await this.attemptRepository.update(attempt.id, {
        status: InviteDeliveryStatus.FAILED,
        finishedAt,
        errorMessage,
      });

      this.logStructured('invite_delivery.attempt_failed', {
        tenantId: params.tenantId,
        envelopeId: params.envelopeId,
        signerId: params.signerId,
        attemptNumber,
        trigger: params.trigger,
        errorMessage,
      });

      throw error;
    }
  }

  private async allocateAttemptNumber(signerId: string, tenantId: string): Promise<number> {
    const raw = await this.attemptRepository
      .createQueryBuilder('attempt')
      .select('MAX(attempt.attempt_number)', 'max')
      .where('attempt.signer_id = :signerId', { signerId })
      .andWhere('attempt.tenant_id = :tenantId', { tenantId })
      .getRawOne<{ max: string | null }>();

    const currentMax = raw?.max === null || raw?.max === undefined ? 0 : Number.parseInt(raw.max, 10);
    return currentMax + 1;
  }

  private logStructured(
    event: string,
    fields: Readonly<Record<string, string | number | null>>,
  ): void {
    this.logger.log(JSON.stringify({ event, ...fields }));
  }
}

export const sanitizeDeliveryError = (error: unknown): string => {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  const trimmed = message.trim();
  if (trimmed.length <= MAX_ERROR_MESSAGE_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_ERROR_MESSAGE_LENGTH);
};
