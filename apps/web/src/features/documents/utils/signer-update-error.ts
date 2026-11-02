import { isAxiosError } from 'axios';

export type SignerUpdateErrorKey =
  | 'notifiedEmail'
  | 'signed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'orderDraftOnly'
  | 'generic';

const API_MESSAGE_TO_KEY: Readonly<Record<string, SignerUpdateErrorKey>> = {
  'Cannot change signer email after an invitation was sent; use resend to the existing address':
    'notifiedEmail',
  'Cannot edit a signer who has already signed': 'signed',
  'Cannot edit signers on a completed envelope': 'completed',
  'Cannot edit signers on a cancelled envelope': 'cancelled',
  'Cannot edit signers on an expired envelope': 'expired',
  'Signer order can only be changed while the envelope is a draft': 'orderDraftOnly',
};

export function extractApiMessage(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null;
  }
  const data = error.response?.data as { message?: string | string[] } | undefined;
  const message = data?.message;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}

export function resolveSignerUpdateErrorKey(apiMessage: string | null): SignerUpdateErrorKey {
  if (apiMessage === null) {
    return 'generic';
  }
  return API_MESSAGE_TO_KEY[apiMessage] ?? 'generic';
}
