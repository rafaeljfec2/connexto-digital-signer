import type { SignerInviteDeliveryAttempt } from '../entities/signer-invite-delivery-attempt.entity';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
  OBSERVED_INVITE_DELIVERY_TRIGGERS,
  type InviteDeliveryAttemptDto,
  type SignerInviteDeliveryDto,
} from '../interfaces/invite-delivery.interface';

export const toAttemptDto = (row: SignerInviteDeliveryAttempt): InviteDeliveryAttemptDto => ({
  attemptNumber: row.attemptNumber,
  trigger: row.trigger,
  status: row.status,
  startedAt: row.startedAt,
  finishedAt: row.finishedAt,
  errorMessage: row.errorMessage,
  isLegacy: row.trigger === InviteDeliveryTrigger.LEGACY_BACKFILL,
});

export const buildSignerInviteDelivery = (
  rows: ReadonlyArray<SignerInviteDeliveryAttempt>,
): SignerInviteDeliveryDto => {
  if (rows.length === 0) {
    return {
      currentStatus: null,
      currentAttemptNumber: null,
      lastFinishedAt: null,
      isHistoricalEstimate: false,
      manualResendCount: 0,
      attempts: [],
    };
  }

  const sorted = [...rows].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const attempts = sorted.map(toAttemptDto);
  const observed = sorted.filter((row) => OBSERVED_INVITE_DELIVERY_TRIGGERS.has(row.trigger));
  const queuedObserved = observed.find((row) => row.status === InviteDeliveryStatus.QUEUED);
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return {
      currentStatus: null,
      currentAttemptNumber: null,
      lastFinishedAt: null,
      isHistoricalEstimate: false,
      manualResendCount: 0,
      attempts,
    };
  }

  const currentRow = queuedObserved ?? latest;
  const terminalRows = sorted.filter(
    (row) =>
      row.status === InviteDeliveryStatus.SENT || row.status === InviteDeliveryStatus.FAILED,
  );
  const lastTerminal = terminalRows[terminalRows.length - 1] ?? null;

  const manualResendCount = sorted.filter(
    (row) =>
      row.trigger === InviteDeliveryTrigger.MANUAL_RESEND &&
      row.status === InviteDeliveryStatus.SENT,
  ).length;

  const isHistoricalEstimate =
    observed.length === 0 &&
    sorted.some((row) => row.trigger === InviteDeliveryTrigger.LEGACY_BACKFILL);

  return {
    currentStatus: currentRow.status,
    currentAttemptNumber: currentRow.attemptNumber,
    lastFinishedAt: lastTerminal?.finishedAt ?? null,
    isHistoricalEstimate,
    manualResendCount,
    attempts,
  };
};
