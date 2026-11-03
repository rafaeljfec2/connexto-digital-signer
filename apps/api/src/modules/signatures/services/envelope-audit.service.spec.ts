import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { CertificateService } from '../../tenants/services/certificate.service';
import { SignerStatus } from '../entities/signer.entity';
import { EnvelopeAuditService, serializeInviteDeliveryForTracking } from './envelope-audit.service';
import { InviteDeliveryService } from './invite-delivery.service';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
} from '../interfaces/invite-delivery.interface';
import { buildDocument, buildEnvelope, buildSigner } from './signatures-test.fixtures';
import { SignaturesService } from './signatures.service';

describe('EnvelopeAuditService', () => {
  let service: EnvelopeAuditService;
  let signaturesService: jest.Mocked<Pick<SignaturesService, 'findByEnvelope' | 'findByToken'>>;
  let documentsService: jest.Mocked<DocumentsService>;
  let envelopesService: jest.Mocked<EnvelopesService>;
  let certificateService: jest.Mocked<CertificateService>;
  let inviteDeliveryService: jest.Mocked<Pick<InviteDeliveryService, 'findByEnvelope'>>;

  beforeEach(() => {
    signaturesService = {
      findByEnvelope: jest.fn().mockResolvedValue([]),
      findByToken: jest.fn(),
    };
    documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocument()]),
    } as unknown as jest.Mocked<DocumentsService>;
    envelopesService = {
      findOne: jest.fn().mockResolvedValue(buildEnvelope()),
    } as unknown as jest.Mocked<EnvelopesService>;
    certificateService = {
      getCertificateStatus: jest.fn(),
    } as unknown as jest.Mocked<CertificateService>;
    inviteDeliveryService = {
      findByEnvelope: jest.fn().mockResolvedValue(new Map()),
    };

    service = new EnvelopeAuditService(
      signaturesService as unknown as SignaturesService,
      documentsService,
      envelopesService,
      certificateService,
      inviteDeliveryService as unknown as InviteDeliveryService,
    );
  });

  describe('getEnvelopeTracking', () => {
    test('should include inviteDelivery with historical legacy estimate', async () => {
      const signer = buildSigner({ id: 'signer-1' });
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      inviteDeliveryService.findByEnvelope.mockResolvedValue(
        new Map([
          [
            'signer-1',
            {
              currentStatus: InviteDeliveryStatus.SENT,
              currentAttemptNumber: 1,
              lastFinishedAt: new Date('2026-01-01T01:00:00.000Z'),
              isHistoricalEstimate: true,
              manualResendCount: 0,
              attempts: [
                {
                  attemptNumber: 1,
                  trigger: InviteDeliveryTrigger.LEGACY_BACKFILL,
                  status: InviteDeliveryStatus.SENT,
                  startedAt: new Date('2026-01-01T01:00:00.000Z'),
                  finishedAt: new Date('2026-01-01T01:00:00.000Z'),
                  errorMessage: null,
                  isLegacy: true,
                },
              ],
            },
          ],
        ]),
      );

      const result = await service.getEnvelopeTracking('env-1', 'tenant-1');

      expect(result.signers[0]?.inviteDelivery).toEqual(
        serializeInviteDeliveryForTracking({
          currentStatus: InviteDeliveryStatus.SENT,
          currentAttemptNumber: 1,
          lastFinishedAt: new Date('2026-01-01T01:00:00.000Z'),
          isHistoricalEstimate: true,
          manualResendCount: 0,
          attempts: [
            {
              attemptNumber: 1,
              trigger: InviteDeliveryTrigger.LEGACY_BACKFILL,
              status: InviteDeliveryStatus.SENT,
              startedAt: new Date('2026-01-01T01:00:00.000Z'),
              finishedAt: new Date('2026-01-01T01:00:00.000Z'),
              errorMessage: null,
              isLegacy: true,
            },
          ],
        }),
      );
    });
  });

  describe('getEnvelopeAuditSummary', () => {
    test('should include document hashes, certificate and timezone', async () => {
      const envelope = buildEnvelope({ status: EnvelopeStatus.COMPLETED });
      const signer = buildSigner({
        status: SignerStatus.SIGNED,
        notifiedAt: new Date('2026-01-01T01:00:00.000Z'),
        signedAt: new Date('2026-01-01T02:00:00.000Z'),
      });
      const document = buildDocument({
        id: 'doc-1',
        title: 'Agreement',
        originalHash: 'hash-original',
        finalHash: 'hash-final',
      });

      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      documentsService.findByEnvelope.mockResolvedValue([document]);
      certificateService.getCertificateStatus.mockResolvedValue({
        subject: 'CN=Signer Certificate',
        issuer: 'CN=Certificate Authority',
        expiresAt: '2030-01-01T00:00:00.000Z',
        configuredAt: '2026-01-01T00:00:00.000Z',
        isExpired: false,
      });

      const result = await service.getEnvelopeAuditSummary('env-1', 'tenant-1');

      expect(result.timezone).toBe('UTC');
      expect(result.documents).toEqual([
        expect.objectContaining({
          id: 'doc-1',
          originalHash: 'hash-original',
          finalHash: 'hash-final',
        }),
      ]);
      expect(result.certificate).toEqual(
        expect.objectContaining({
          subject: 'CN=Signer Certificate',
          issuer: 'CN=Certificate Authority',
          isExpired: false,
        }),
      );
    });

    test('should propagate hashes to summary document when only one document exists', async () => {
      const document = buildDocument({
        id: 'doc-single',
        originalHash: 'single-original',
        finalHash: 'single-final',
      });
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      signaturesService.findByEnvelope.mockResolvedValue([]);
      documentsService.findByEnvelope.mockResolvedValue([document]);
      certificateService.getCertificateStatus.mockResolvedValue(null);

      const result = await service.getEnvelopeAuditSummary('env-1', 'tenant-1');

      expect(result.document.originalHash).toBe('single-original');
      expect(result.document.finalHash).toBe('single-final');
    });

    test('should keep summary document hashes null when multiple documents exist', async () => {
      const first = buildDocument({
        id: 'doc-1',
        originalHash: 'hash-1',
        finalHash: 'final-1',
      });
      const second = buildDocument({
        id: 'doc-2',
        title: 'Attachment',
        originalHash: 'hash-2',
        finalHash: 'final-2',
      });
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      signaturesService.findByEnvelope.mockResolvedValue([]);
      documentsService.findByEnvelope.mockResolvedValue([first, second]);
      certificateService.getCertificateStatus.mockResolvedValue(null);

      const result = await service.getEnvelopeAuditSummary('env-1', 'tenant-1');

      expect(result.document.originalHash).toBeNull();
      expect(result.document.finalHash).toBeNull();
      expect(result.documents).toHaveLength(2);
    });

    test('should include viewed events in audit timeline', async () => {
      const signer = buildSigner({
        status: SignerStatus.SIGNED,
        notifiedAt: new Date('2026-01-01T01:00:00.000Z'),
        viewedAt: new Date('2026-01-01T01:30:00.000Z'),
        signedAt: new Date('2026-01-01T02:00:00.000Z'),
      });
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      certificateService.getCertificateStatus.mockResolvedValue(null);

      const result = await service.getEnvelopeAuditSummary('env-1', 'tenant-1');

      expect(result.timeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'viewed', actorName: signer.name }),
        ]),
      );
    });
  });
});
