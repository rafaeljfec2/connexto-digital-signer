import { BadRequestException } from '@nestjs/common';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { SignerStatus } from '../entities/signer.entity';
import { buildEnvelope, buildSigner } from '../services/signatures-test.fixtures';
import { assertSignerUpdateAllowed } from './signer-update-policy';

describe('signer-update-policy', () => {
  it('should block email change after invitation was sent', () => {
    const envelope = buildEnvelope({ status: EnvelopeStatus.PENDING_SIGNATURES });
    const signer = buildSigner({
      email: 'a@example.com',
      notifiedAt: new Date(),
    });
    expect(() =>
      assertSignerUpdateAllowed(envelope, signer, { email: 'b@example.com' }),
    ).toThrow(BadRequestException);
  });

  it('should allow name change on pending envelope', () => {
    const envelope = buildEnvelope({ status: EnvelopeStatus.PENDING_SIGNATURES });
    const signer = buildSigner({ notifiedAt: new Date() });
    expect(() =>
      assertSignerUpdateAllowed(envelope, signer, { name: 'Updated Name' }),
    ).not.toThrow();
  });

  it('should block edits on signed signers', () => {
    const envelope = buildEnvelope();
    const signer = buildSigner({ status: SignerStatus.SIGNED });
    expect(() =>
      assertSignerUpdateAllowed(envelope, signer, { name: 'X' }),
    ).toThrow(BadRequestException);
  });
});
