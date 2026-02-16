import type { SignerStatus } from '../entities/signer.entity';

export interface SignerPendingDocument {
  readonly signerId: string;
  readonly signerName: string;
  readonly signerEmail: string;
  readonly signerCpf: string | null;
  readonly signerPhone: string | null;
  readonly signerStatus: SignerStatus;
  readonly accessToken: string;
  readonly envelopeId: string;
  readonly envelopeTitle: string;
  readonly envelopeCreatedAt: Date;
  readonly envelopeExpiresAt: Date | null;
}
