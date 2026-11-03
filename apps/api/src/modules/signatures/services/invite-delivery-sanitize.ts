import { BadRequestException } from '@nestjs/common';
import {
  GENERIC_INVITE_DELIVERY_FAILED_MESSAGE,
  GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE,
} from './invite-delivery.constants';

const MAX_ERROR_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const redactSensitiveText = (message: string): string =>
  message.replace(EMAIL_PATTERN, '[redacted]').trim();

export const sanitizeDeliveryErrorForLog = (error: unknown): string => {
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  const redacted = redactSensitiveText(message);
  if (redacted.length <= MAX_ERROR_MESSAGE_LENGTH) {
    return redacted;
  }
  return redacted.slice(0, MAX_ERROR_MESSAGE_LENGTH);
};

/** Safe for API/tracking persistence — no provider internals or PII. */
export const sanitizeDeliveryErrorForStorage = (error: unknown): string => {
  if (error instanceof BadRequestException) {
    return GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE;
  }
  return GENERIC_INVITE_DELIVERY_FAILED_MESSAGE;
};
