import type { EnvelopeTracking, TrackingSigner } from '../api';

export function isActiveSequentialSigner(
  signer: TrackingSigner,
  signers: ReadonlyArray<TrackingSigner>,
): boolean {
  const pending = signers
    .filter((item) => item.status === 'pending')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return pending[0]?.id === signer.id;
}

export function canResendSignerInvite(
  tracking: EnvelopeTracking,
  signer: TrackingSigner,
): boolean {
  if (tracking.envelope.status !== 'pending_signatures') {
    return false;
  }
  if (signer.status !== 'pending') {
    return false;
  }
  if (tracking.envelope.signingMode === 'sequential') {
    return isActiveSequentialSigner(signer, tracking.signers);
  }
  return true;
}
