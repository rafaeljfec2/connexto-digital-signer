import { BadRequestException } from '@nestjs/common';
import {
  sanitizeDeliveryErrorForLog,
  sanitizeDeliveryErrorForStorage,
} from './invite-delivery-sanitize';
import { GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE } from './invite-delivery.constants';

describe('invite-delivery-sanitize', () => {
  test('should store generic message for provider rejection', () => {
    expect(
      sanitizeDeliveryErrorForStorage(
        new BadRequestException('Email provider did not accept the signature invitation'),
      ),
    ).toBe(GENERIC_INVITE_PROVIDER_REJECTED_MESSAGE);
  });

  test('should redact emails in log-oriented messages', () => {
    const message = sanitizeDeliveryErrorForLog(
      new Error('Failed for user@example.com with secret details'),
    );
    expect(message).not.toContain('user@example.com');
    expect(message).toContain('[redacted]');
  });
});
