import { BadRequestException } from '@nestjs/common';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { Envelope, EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { Signer, SignerStatus } from '../entities/signer.entity';
import type { UpdateSignerDto } from '../dto/update-signer.dto';

export function assertSignerUpdateAllowed(
  envelope: Pick<Envelope, 'status'>,
  signer: Signer,
  dto: UpdateSignerDto,
): void {
  if (envelope.status === EnvelopeStatus.COMPLETED) {
    throw new BadRequestException('Cannot edit signers on a completed envelope');
  }
  if (envelope.status === EnvelopeStatus.CANCELLED) {
    throw new BadRequestException('Cannot edit signers on a cancelled envelope');
  }
  if (envelope.status === EnvelopeStatus.EXPIRED) {
    throw new BadRequestException('Cannot edit signers on an expired envelope');
  }
  if (signer.status === SignerStatus.SIGNED) {
    throw new BadRequestException('Cannot edit a signer who has already signed');
  }
  if (envelope.status !== EnvelopeStatus.DRAFT && dto.order !== undefined) {
    throw new BadRequestException('Signer order can only be changed while the envelope is a draft');
  }
  if (
    dto.email !== undefined &&
    dto.email.toLowerCase() !== signer.email.toLowerCase() &&
    signer.notifiedAt !== null
  ) {
    throw new BadRequestException(
      'Cannot change signer email after an invitation was sent; use resend to the existing address',
    );
  }
}

export function isEnvelopeEditableForSigners(status: EnvelopeStatus): boolean {
  return status === EnvelopeStatus.DRAFT || status === EnvelopeStatus.PENDING_SIGNATURES;
}

export function mapCancelledDocumentStatus(): DocumentStatus {
  return DocumentStatus.CANCELLED;
}
