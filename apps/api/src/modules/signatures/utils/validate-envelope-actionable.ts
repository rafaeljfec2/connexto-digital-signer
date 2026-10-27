import { BadRequestException } from '@nestjs/common';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';

export function validateEnvelopeIsActionable(envelope: {
  readonly status: EnvelopeStatus;
  readonly expiresAt: Date | null;
}): void {
  if (envelope.status === EnvelopeStatus.COMPLETED) {
    throw new BadRequestException('Envelope is already completed');
  }
  if (envelope.expiresAt !== null && new Date() > envelope.expiresAt) {
    throw new BadRequestException('Envelope has expired');
  }
}
