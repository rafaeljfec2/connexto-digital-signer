export enum InviteDeliveryTrigger {
  INITIAL_SEND = 'initial_send',
  SEQUENTIAL_NEXT = 'sequential_next',
  MANUAL_RESEND = 'manual_resend',
  LEGACY_BACKFILL = 'legacy_backfill',
}

export enum InviteDeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

export const OBSERVED_INVITE_DELIVERY_TRIGGERS: ReadonlySet<InviteDeliveryTrigger> = new Set([
  InviteDeliveryTrigger.INITIAL_SEND,
  InviteDeliveryTrigger.SEQUENTIAL_NEXT,
  InviteDeliveryTrigger.MANUAL_RESEND,
]);

export type InviteDeliveryAttemptDto = Readonly<{
  attemptNumber: number;
  trigger: InviteDeliveryTrigger;
  status: InviteDeliveryStatus;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
  isLegacy: boolean;
}>;

export type SignerInviteDeliveryDto = Readonly<{
  currentStatus: InviteDeliveryStatus | null;
  currentAttemptNumber: number | null;
  lastFinishedAt: Date | null;
  isHistoricalEstimate: boolean;
  manualResendCount: number;
  attempts: ReadonlyArray<InviteDeliveryAttemptDto>;
}>;
