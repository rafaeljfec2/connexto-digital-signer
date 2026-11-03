import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_DOCUMENT_SENT } from '@connexto/events';
import type { Repository } from 'typeorm';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { Envelope, EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CertificateService } from '../../tenants/services/certificate.service';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { EnvelopeDispatchService } from './envelope-dispatch.service';
import { InviteDeliveryService } from './invite-delivery.service';
import { SignatureFieldsService } from './signature-fields.service';
import { buildDocument, buildEnvelope, buildSigner } from './signatures-test.fixtures';
import { SignaturesService } from './signatures.service';

describe('EnvelopeDispatchService', () => {
  let service: EnvelopeDispatchService;
  let signerRepository: Repository<Signer>;
  let signaturesService: jest.Mocked<Pick<SignaturesService, 'findByEnvelope'>>;
  let documentsService: jest.Mocked<DocumentsService>;
  let envelopesService: jest.Mocked<EnvelopesService>;
  let eventEmitter: EventEmitter2;
  let pdfService: jest.Mocked<PdfService>;
  let fieldsService: jest.Mocked<SignatureFieldsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let certificateService: jest.Mocked<CertificateService>;
  let inviteDeliveryService: jest.Mocked<InviteDeliveryService>;

  beforeEach(() => {
    signerRepository = {
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as Repository<Signer>;
    signaturesService = {
      findByEnvelope: jest.fn().mockResolvedValue([]),
    };
    documentsService = {
      findOne: jest.fn(),
      findByEnvelope: jest.fn().mockResolvedValue([buildDocument()]),
      getOriginalFile: jest.fn(),
      setFinalPdf: jest.fn(),
      setStatus: jest.fn(),
    } as unknown as jest.Mocked<DocumentsService>;
    envelopesService = {
      findOne: jest.fn().mockResolvedValue(buildEnvelope()),
      setStatus: jest.fn(),
    } as unknown as jest.Mocked<EnvelopesService>;
    eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    pdfService = {
      appendEvidencePage: jest.fn(),
      embedSignatures: jest.fn(),
      computeHash: jest.fn(),
    } as unknown as jest.Mocked<PdfService>;
    fieldsService = {
      findByDocument: jest.fn(),
    } as unknown as jest.Mocked<SignatureFieldsService>;
    notificationsService = {
      sendSignatureInvite: jest.fn(),
      buildSignatureInvite: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    certificateService = {
      signPdf: jest.fn(),
      generateP7s: jest.fn(),
      getCertificateStatus: jest.fn(),
    } as unknown as jest.Mocked<CertificateService>;
    inviteDeliveryService = {
      executeInviteDelivery: jest.fn(async (_params, send) => {
        await send();
        return { attemptNumber: 1 };
      }),
    } as unknown as jest.Mocked<InviteDeliveryService>;

    service = new EnvelopeDispatchService(
      signerRepository,
      signaturesService as unknown as SignaturesService,
      documentsService,
      envelopesService,
      eventEmitter,
      pdfService,
      fieldsService,
      notificationsService,
      certificateService,
      inviteDeliveryService,
    );
  });

  describe('areAllSignersSigned', () => {
    test('should return false when no signers', async () => {
      signaturesService.findByEnvelope.mockResolvedValue([]);
      await expect(service.areAllSignersSigned('env-1', 'tenant-1')).resolves.toBe(false);
    });

    test('should return true when all signed', async () => {
      signaturesService.findByEnvelope.mockResolvedValue([
        buildSigner({ status: SignerStatus.SIGNED }),
      ]);
      await expect(service.areAllSignersSigned('env-1', 'tenant-1')).resolves.toBe(true);
    });
  });

  describe('sendEnvelope', () => {
    test('should reject when no signers', async () => {
      envelopesService.findOne.mockResolvedValue(
        buildEnvelope({ signingMode: SigningMode.PARALLEL }),
      );
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      signaturesService.findByEnvelope.mockResolvedValue([]);

      await expect(service.sendEnvelope('tenant-1', 'env-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    test('should notify first signer when sequential', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.SEQUENTIAL });
      const signers = [
        buildSigner({ id: 'signer-1', order: 1 }),
        buildSigner({ id: 'signer-2', order: 2, email: 'two@acme.com' }),
      ];
      envelopesService.findOne.mockResolvedValue(envelope);
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      signaturesService.findByEnvelope.mockResolvedValue(signers);
      (signerRepository.save as jest.Mock).mockImplementation(async (s: Signer) => s);
      notificationsService.sendSignatureInvite.mockResolvedValue('provider-id');

      const result = await service.sendEnvelope('tenant-1', 'env-1');

      expect(result.notified).toEqual(['signer-1']);
      expect(documentsService.setStatus).toHaveBeenCalledWith(
        'doc-1',
        'tenant-1',
        DocumentStatus.PENDING_SIGNATURES,
      );
      expect(envelopesService.setStatus).toHaveBeenCalledWith(
        'env-1',
        'tenant-1',
        EnvelopeStatus.PENDING_SIGNATURES,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_SENT,
        expect.objectContaining({
          documentId: 'env-1',
          tenantId: 'tenant-1',
          signingMode: SigningMode.SEQUENTIAL,
        }),
      );
      expect(notificationsService.sendSignatureInvite).toHaveBeenCalledTimes(1);
      expect(signerRepository.save).toHaveBeenCalledTimes(1);
      const sendOrder =
        notificationsService.sendSignatureInvite.mock.invocationCallOrder[0] ?? 0;
      const saveOrder = (signerRepository.save as jest.Mock).mock.invocationCallOrder[0] ?? 0;
      expect(sendOrder).toBeLessThan(saveOrder);
    });

    test('should notify all pending signers in parallel mode', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.PARALLEL });
      const signers = [
        buildSigner({ id: 'signer-1', order: 1 }),
        buildSigner({ id: 'signer-2', order: 2, email: 'two@acme.com' }),
      ];
      envelopesService.findOne.mockResolvedValue(envelope);
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      signaturesService.findByEnvelope.mockResolvedValue(signers);
      (signerRepository.save as jest.Mock).mockImplementation(async (s: Signer) => s);
      notificationsService.sendSignatureInvite.mockResolvedValue('provider-id');

      const result = await service.sendEnvelope('tenant-1', 'env-1');

      expect(result.notified).toEqual(['signer-1', 'signer-2']);
      expect(notificationsService.sendSignatureInvite).toHaveBeenCalledTimes(2);
      expect(signerRepository.save).toHaveBeenCalledTimes(2);
    });

    test('should not persist notifiedAt when provider rejects the invite', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.PARALLEL });
      const signers = [buildSigner({ id: 'signer-1' })];
      envelopesService.findOne.mockResolvedValue(envelope);
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      signaturesService.findByEnvelope.mockResolvedValue(signers);
      notificationsService.sendSignatureInvite.mockRejectedValue(
        new BadRequestException('Email provider did not accept the signature invitation'),
      );

      await expect(service.sendEnvelope('tenant-1', 'env-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(signerRepository.save).not.toHaveBeenCalled();
      expect(envelopesService.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('resendSignerInvitation', () => {
    test('should resend to eligible pending signer and update notifiedAt', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.PARALLEL });
      const signer = buildSigner({ id: 'signer-1', notifiedAt: null });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      (signerRepository.update as jest.Mock)
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });
      notificationsService.sendSignatureInvite.mockResolvedValue('provider-id');

      const result = await service.resendSignerInvitation(
        'tenant-1',
        'env-1',
        'signer-1',
      );

      expect(result.signerId).toBe('signer-1');
      expect(result.notifiedAt).toBeInstanceOf(Date);
      expect(result.attemptNumber).toBe(1);
      expect(notificationsService.sendSignatureInvite).toHaveBeenCalledWith(
        expect.objectContaining({ signerEmail: 'jane@acme.com' }),
      );
      expect(signerRepository.update).toHaveBeenLastCalledWith(
        { id: 'signer-1', tenantId: 'tenant-1' },
        expect.objectContaining({ notifiedAt: expect.any(Date) }),
      );
    });

    test('should reject resend for signed signer', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({ id: 'signer-1', status: SignerStatus.SIGNED });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-1'),
      ).rejects.toThrow(BadRequestException);
      expect(notificationsService.sendSignatureInvite).not.toHaveBeenCalled();
    });

    test('should reject resend for expired envelope status', async () => {
      const envelope = buildEnvelope({ status: EnvelopeStatus.EXPIRED });
      const signer = buildSigner({ id: 'signer-1' });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject resend for completed envelope', async () => {
      const envelope = buildEnvelope({ status: EnvelopeStatus.COMPLETED });
      const signer = buildSigner({ id: 'signer-1' });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject resend for non-active sequential signer', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.SEQUENTIAL });
      const first = buildSigner({ id: 'signer-1', order: 1 });
      const second = buildSigner({ id: 'signer-2', order: 2, email: 'two@acme.com' });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([first, second]);

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-2'),
      ).rejects.toThrow(BadRequestException);
    });

    test('should not send duplicate email when concurrent claim fails', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({ id: 'signer-1' });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      (signerRepository.update as jest.Mock).mockResolvedValue({ affected: 0 });

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-1'),
      ).rejects.toThrow(ConflictException);
      expect(notificationsService.sendSignatureInvite).not.toHaveBeenCalled();
    });

    test('should keep notifiedAt unchanged when provider rejects resend', async () => {
      const envelope = buildEnvelope();
      const signer = buildSigner({
        id: 'signer-1',
        notifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      envelopesService.findOne.mockResolvedValue(envelope);
      signaturesService.findByEnvelope.mockResolvedValue([signer]);
      (signerRepository.update as jest.Mock)
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });
      notificationsService.sendSignatureInvite.mockRejectedValue(
        new BadRequestException('Email provider did not accept the signature invitation'),
      );

      await expect(
        service.resendSignerInvitation('tenant-1', 'env-1', 'signer-1'),
      ).rejects.toThrow(BadRequestException);
      expect(signerRepository.update).toHaveBeenCalledWith(
        { id: 'signer-1', tenantId: 'tenant-1' },
        { updatedAt: signer.updatedAt },
      );
      expect(signerRepository.update).not.toHaveBeenCalledWith(
        { id: 'signer-1', tenantId: 'tenant-1' },
        expect.objectContaining({ notifiedAt: expect.any(Date) }),
      );
    });
  });

  describe('finalizeDocument', () => {
    test('should generate .p7s and store it together with final pdf when certificate is valid', async () => {
      const originalBuffer = Buffer.from('original');
      const withSignatures = Buffer.from('with-signatures');
      const evidencePdf = Buffer.from('evidence-pdf');
      const signedPdf = Buffer.from('signed-pdf');
      const p7sBuffer = Buffer.from('p7s-signature');

      documentsService.findOne.mockResolvedValue(buildDocument());
      documentsService.getOriginalFile.mockResolvedValue(originalBuffer);
      fieldsService.findByDocument.mockResolvedValue([]);
      pdfService.embedSignatures.mockResolvedValue(withSignatures);
      pdfService.computeHash.mockImplementation((buffer: Buffer) =>
        buffer === originalBuffer ? 'hash-original' : 'hash-signed',
      );
      pdfService.appendEvidencePage.mockResolvedValue(evidencePdf);
      certificateService.signPdf.mockResolvedValue(signedPdf);
      certificateService.generateP7s.mockResolvedValue(p7sBuffer);

      await (
        service as unknown as {
          finalizeDocument: (
            documentId: string,
            tenantId: string,
            envelope: Envelope,
            evidence: Array<{
              name: string;
              email: string;
              cpf: string | null;
              role: string;
              signedAt: string;
              notifiedAt: string | null;
              verifiedAt: string | null;
              ipAddress: string | null;
              userAgent: string | null;
              signatureData: string | null;
            }>,
            certificateStatus: {
              subject: string;
              issuer: string;
              expiresAt: string;
              configuredAt: string;
              isExpired: boolean;
            } | null,
          ) => Promise<void>;
        }
      ).finalizeDocument('doc-1', 'tenant-1', buildEnvelope(), [], {
        subject: 'Tenant Certificate',
        issuer: 'AC',
        expiresAt: '2030-01-01T00:00:00.000Z',
        configuredAt: '2026-01-01T00:00:00.000Z',
        isExpired: false,
      });

      expect(certificateService.signPdf).toHaveBeenCalledWith('tenant-1', evidencePdf);
      expect(certificateService.generateP7s).toHaveBeenCalledWith('tenant-1', signedPdf);
      expect(documentsService.setFinalPdf).toHaveBeenCalledWith(
        'doc-1',
        'tenant-1',
        signedPdf,
        p7sBuffer,
      );
    });

    test('should finalize without .p7s when certificate is expired', async () => {
      const originalBuffer = Buffer.from('original');
      const withSignatures = Buffer.from('with-signatures');
      const evidencePdf = Buffer.from('evidence-pdf');

      documentsService.findOne.mockResolvedValue(buildDocument());
      documentsService.getOriginalFile.mockResolvedValue(originalBuffer);
      fieldsService.findByDocument.mockResolvedValue([]);
      pdfService.embedSignatures.mockResolvedValue(withSignatures);
      pdfService.computeHash.mockImplementation((buffer: Buffer) =>
        buffer === originalBuffer ? 'hash-original' : 'hash-signed',
      );
      pdfService.appendEvidencePage.mockResolvedValue(evidencePdf);

      await (
        service as unknown as {
          finalizeDocument: (
            documentId: string,
            tenantId: string,
            envelope: Envelope,
            evidence: Array<{
              name: string;
              email: string;
              cpf: string | null;
              role: string;
              signedAt: string;
              notifiedAt: string | null;
              verifiedAt: string | null;
              ipAddress: string | null;
              userAgent: string | null;
              signatureData: string | null;
            }>,
            certificateStatus: {
              subject: string;
              issuer: string;
              expiresAt: string;
              configuredAt: string;
              isExpired: boolean;
            } | null,
          ) => Promise<void>;
        }
      ).finalizeDocument('doc-1', 'tenant-1', buildEnvelope(), [], {
        subject: 'Tenant Certificate',
        issuer: 'AC',
        expiresAt: '2020-01-01T00:00:00.000Z',
        configuredAt: '2026-01-01T00:00:00.000Z',
        isExpired: true,
      });

      expect(certificateService.signPdf).not.toHaveBeenCalled();
      expect(certificateService.generateP7s).not.toHaveBeenCalled();
      expect(documentsService.setFinalPdf).toHaveBeenCalledWith(
        'doc-1',
        'tenant-1',
        evidencePdf,
        null,
      );
    });
  });
});
