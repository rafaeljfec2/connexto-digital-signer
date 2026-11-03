import { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
} from '../interfaces/invite-delivery.interface';
import { buildSignerInviteDelivery } from './invite-delivery.mapper';

const buildAttempt = (
  overrides: Partial<SignerInviteDeliveryAttempt>,
): SignerInviteDeliveryAttempt => ({
  id: 'attempt-1',
  tenantId: 'tenant-1',
  envelopeId: 'env-1',
  signerId: 'signer-1',
  attemptNumber: 1,
  trigger: InviteDeliveryTrigger.INITIAL_SEND,
  status: InviteDeliveryStatus.SENT,
  startedAt: new Date('2026-01-01T10:00:00.000Z'),
  finishedAt: new Date('2026-01-01T10:00:01.000Z'),
  errorMessage: null,
  providerMessageId: 'msg-1',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('buildSignerInviteDelivery', () => {
  test('should return empty delivery when no attempts exist', () => {
    const result = buildSignerInviteDelivery([]);

    expect(result.currentStatus).toBeNull();
    expect(result.attempts).toHaveLength(0);
    expect(result.isHistoricalEstimate).toBe(false);
  });

  test('should mark legacy-only state as historical estimate', () => {
    const result = buildSignerInviteDelivery([
      buildAttempt({
        trigger: InviteDeliveryTrigger.LEGACY_BACKFILL,
        attemptNumber: 1,
      }),
    ]);

    expect(result.currentStatus).toBe(InviteDeliveryStatus.SENT);
    expect(result.isHistoricalEstimate).toBe(true);
    expect(result.attempts[0]?.isLegacy).toBe(true);
  });

  test('should prefer queued observed attempt as current status', () => {
    const result = buildSignerInviteDelivery([
      buildAttempt({
        attemptNumber: 1,
        status: InviteDeliveryStatus.SENT,
        trigger: InviteDeliveryTrigger.INITIAL_SEND,
      }),
      buildAttempt({
        id: 'attempt-2',
        attemptNumber: 2,
        status: InviteDeliveryStatus.QUEUED,
        trigger: InviteDeliveryTrigger.MANUAL_RESEND,
        finishedAt: null,
      }),
    ]);

    expect(result.currentStatus).toBe(InviteDeliveryStatus.QUEUED);
    expect(result.currentAttemptNumber).toBe(2);
  });

  test('should count successful manual resends', () => {
    const result = buildSignerInviteDelivery([
      buildAttempt({ attemptNumber: 1 }),
      buildAttempt({
        id: 'attempt-2',
        attemptNumber: 2,
        trigger: InviteDeliveryTrigger.MANUAL_RESEND,
        status: InviteDeliveryStatus.FAILED,
        finishedAt: new Date('2026-01-01T10:05:00.000Z'),
      }),
      buildAttempt({
        id: 'attempt-3',
        attemptNumber: 3,
        trigger: InviteDeliveryTrigger.MANUAL_RESEND,
        status: InviteDeliveryStatus.SENT,
        finishedAt: new Date('2026-01-01T10:10:00.000Z'),
      }),
    ]);

    expect(result.manualResendCount).toBe(1);
  });
});
