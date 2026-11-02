import { BadRequestException } from '@nestjs/common';
import { EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { SignerStatus } from '../entities/signer.entity';
import { buildEnvelope, buildSigner } from '../services/signatures-test.fixtures';
import {
  assertSignerEligibleForInviteDelivery,
  isActiveSequentialSigner,
  validateEnvelopeAllowsInviteDelivery,
} from './signer-invite-eligibility';

describe('signer-invite-eligibility', () => {
  describe('validateEnvelopeAllowsInviteDelivery', () => {
    it('should reject completed envelopes', () => {
      expect(() =>
        validateEnvelopeAllowsInviteDelivery(
          buildEnvelope({ status: EnvelopeStatus.COMPLETED }),
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject expired envelopes', () => {
      expect(() =>
        validateEnvelopeAllowsInviteDelivery(
          buildEnvelope({ status: EnvelopeStatus.EXPIRED }),
        ),
      ).toThrow(BadRequestException);
    });

    it('should reject draft envelopes', () => {
      expect(() =>
        validateEnvelopeAllowsInviteDelivery(
          buildEnvelope({ status: EnvelopeStatus.DRAFT }),
        ),
      ).toThrow(BadRequestException);
    });

    it('should allow pending signatures envelopes', () => {
      expect(() =>
        validateEnvelopeAllowsInviteDelivery(
          buildEnvelope({ status: EnvelopeStatus.PENDING_SIGNATURES }),
        ),
      ).not.toThrow();
    });
  });

  describe('isActiveSequentialSigner', () => {
    it('should identify the lowest order pending signer as active', () => {
      const first = buildSigner({ id: 's1', order: 1 });
      const second = buildSigner({ id: 's2', order: 2 });
      expect(isActiveSequentialSigner(first, [first, second])).toBe(true);
      expect(isActiveSequentialSigner(second, [first, second])).toBe(false);
    });
  });

  describe('assertSignerEligibleForInviteDelivery', () => {
    it('should reject signed signers', () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.PARALLEL });
      const signed = buildSigner({ status: SignerStatus.SIGNED });
      expect(() =>
        assertSignerEligibleForInviteDelivery(envelope, signed, [signed]),
      ).toThrow(BadRequestException);
    });

    it('should reject non-active sequential signers', () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.SEQUENTIAL });
      const first = buildSigner({ id: 's1', order: 1 });
      const second = buildSigner({ id: 's2', order: 2 });
      expect(() =>
        assertSignerEligibleForInviteDelivery(envelope, second, [first, second]),
      ).toThrow(BadRequestException);
    });

    it('should allow active sequential pending signer', () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.SEQUENTIAL });
      const first = buildSigner({ id: 's1', order: 1 });
      const second = buildSigner({ id: 's2', order: 2 });
      expect(() =>
        assertSignerEligibleForInviteDelivery(envelope, first, [first, second]),
      ).not.toThrow();
    });
  });
});
