import { BadRequestException } from '@nestjs/common';
import { EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { validateEnvelopeIsActionable } from './validate-envelope-actionable';

export function validateEnvelopeAllowsInviteDelivery(envelope: {
  readonly status: EnvelopeStatus;
  readonly expiresAt: Date | null;
}): void {
  validateEnvelopeIsActionable(envelope);
  if (envelope.status === EnvelopeStatus.EXPIRED) {
    throw new BadRequestException('Envelope has expired');
  }
  if (envelope.status === EnvelopeStatus.DRAFT) {
    throw new BadRequestException('Envelope has not been sent yet');
  }
  if (envelope.status !== EnvelopeStatus.PENDING_SIGNATURES) {
    throw new BadRequestException('Envelope is not awaiting signatures');
  }
}

export function isActiveSequentialSigner(
  signer: Pick<Signer, 'id' | 'order'>,
  pendingSigners: ReadonlyArray<Pick<Signer, 'id' | 'order'>>,
): boolean {
  const sorted = [...pendingSigners].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  return sorted[0]?.id === signer.id;
}

export function assertSignerEligibleForInviteDelivery(
  envelope: {
    readonly status: EnvelopeStatus;
    readonly expiresAt: Date | null;
    readonly signingMode: SigningMode;
  },
  signer: Signer,
  envelopeSigners: Signer[],
): void {
  validateEnvelopeAllowsInviteDelivery(envelope);

  if (signer.status === SignerStatus.SIGNED) {
    throw new BadRequestException('Signer has already signed');
  }

  if (envelope.signingMode === SigningMode.SEQUENTIAL) {
    const pending = envelopeSigners.filter((s) => s.status === SignerStatus.PENDING);
    if (!isActiveSequentialSigner(signer, pending)) {
      throw new BadRequestException(
        'Only the active signer can receive an invitation in sequential mode',
      );
    }
  }
}
