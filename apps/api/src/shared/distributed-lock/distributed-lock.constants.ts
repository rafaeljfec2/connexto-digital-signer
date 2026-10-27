export const DISTRIBUTED_LOCK_REDIS = 'DISTRIBUTED_LOCK_REDIS';

export const CRON_LOCK_TTL_MS = 50 * 60 * 1000;

export const CRON_LOCK_KEYS = {
  reminders: 'nexosign:cron:reminders',
  expiredEnvelopes: 'nexosign:cron:expired-envelopes',
} as const;
