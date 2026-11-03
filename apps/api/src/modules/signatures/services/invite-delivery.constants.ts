/** Queued attempts older than this are marked failed before new deliveries proceed. */
export const STALE_INVITE_DELIVERY_QUEUED_MS = 15 * 60 * 1000;

export const GENERIC_INVITE_DELIVERY_FAILED_MESSAGE = 'Invite delivery failed';

export const GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE =
  'Email provider did not accept the invitation';
