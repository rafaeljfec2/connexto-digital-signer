import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SignaturesService } from './signatures.service';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { Envelope, EnvelopeStatus, SigningMode } from '../../envelopes/entities/envelope.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { EVENT_SIGNATURE_COMPLETED, EVENT_DOCUMENT_SENT } from '@connexto/events';
import type { SignatureCompletedEvent } from '@connexto/events';
import { SignatureFieldsService } from './signature-fields.service';
import { TenantSignerService } from './tenant-signer.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CertificateService } from '../../tenants/services/certificate.service';

const buildSigner = (overrides?: Partial<Signer>): Signer => ({
  id: 'signer-1',
  tenantId: 'tenant-1',
  envelopeId: 'env-1',
  tenantSignerId: null,
  name: 'Jane Doe',
  email: 'jane@acme.com',
  status: SignerStatus.PENDING,
  accessToken: 'token-1',
  cpf: null,
  birthDate: null,
  phone: null,
  requestEmail: false,
  requestCpf: false,
  requestPhone: false,
  authMethod: 'email',
  reminderCount: 0,
  order: null,
  notifiedAt: null,
  viewedAt: null,
  signedAt: null,
  ipAddress: null,
  userAgent: null,
  verificationCode: null,
  verificationExpiresAt: null,
  verificationAttempts: 0,
  verifiedAt: null,
  signatureData: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildEnvelope = (overrides?: Partial<Envelope>): Envelope => ({
  id: 'env-1',
  tenantId: 'tenant-1',
  folderId: 'folder-1',
  title: 'Agreement',
  status: EnvelopeStatus.PENDING_SIGNATURES,
  signingMode: SigningMode.PARALLEL,
  expiresAt: null,
  reminderInterval: 'none',
  signingLanguage: 'pt-br',
  closureMode: 'automatic',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc-1',
  tenantId: 'tenant-1',
  envelopeId: 'env-1',
  title: 'Agreement',
  originalFileKey: 'original.pdf',
  finalFileKey: null,
  originalHash: 'hash-original',
  finalHash: null,
  status: DocumentStatus.PENDING_SIGNATURES,
  version: 1,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('SignaturesService', () => {
  let service: SignaturesService;
  let signerRepository: Repository<Signer>;
  let documentsService: jest.Mocked<DocumentsService>;
  let envelopesService: jest.Mocked<EnvelopesService>;
  let eventEmitter: EventEmitter2;
  let pdfService: jest.Mocked<PdfService>;
  let fieldsService: jest.Mocked<SignatureFieldsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let certificateService: jest.Mocked<CertificateService>;
  let tenantSignerService: jest.Mocked<TenantSignerService>;

  beforeEach(() => {
    signerRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<Signer>;
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
      findBySigner: jest.fn(),
      updateValue: jest.fn(),
      updateValueByFieldId: jest.fn(),
    } as unknown as jest.Mocked<SignatureFieldsService>;
    notificationsService = {
      sendSignatureInvite: jest.fn(),
      buildSignatureInvite: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    certificateService = {
      hasCertificate: jest.fn().mockResolvedValue(false),
      signPdf: jest.fn(),
      uploadCertificate: jest.fn(),
      getCertificateStatus: jest.fn(),
      removeCertificate: jest.fn(),
      validateAndExtract: jest.fn(),
    } as unknown as jest.Mocked<CertificateService>;
    tenantSignerService = {
      findOrCreate: jest.fn().mockResolvedValue({ id: 'ts-1' }),
      search: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<TenantSignerService>;
    service = new SignaturesService(
      signerRepository,
      documentsService,
      envelopesService,
      eventEmitter,
      pdfService,
      fieldsService,
      notificationsService,
      certificateService,
      tenantSignerService,
    );
  });

  describe('addSigner', () => {
    test('should create signer, link to tenant signer and return saved signer', async () => {
      const envelope = buildEnvelope();
      const created = buildSigner({ accessToken: 'token-generated', tenantSignerId: 'ts-1' });
      const saved = buildSigner({ id: 'signer-2', accessToken: 'token-generated', tenantSignerId: 'ts-1' });
      envelopesService.findOne.mockResolvedValue(envelope);
      tenantSignerService.findOrCreate.mockResolvedValue({ id: 'ts-1' } as never);
      (signerRepository.create as jest.Mock).mockReturnValue(created);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      const result = await service.addSigner('tenant-1', 'env-1', {
        name: 'Jane',
        email: 'jane@acme.com',
      });

      expect(result).toEqual(saved);
      expect(tenantSignerService.findOrCreate).toHaveBeenCalledWith('tenant-1', {
        name: 'Jane',
        email: 'jane@acme.com',
        cpf: undefined,
        phone: undefined,
        birthDate: undefined,
      });
      expect(envelopesService.findOne).toHaveBeenCalledWith('env-1', 'tenant-1');
      expect(signerRepository.create).toHaveBeenCalled();
      expect(signerRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('findByToken', () => {
    test('should throw NotFoundException when signer does not exist', async () => {
      (signerRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findByToken('token-x')).rejects.toThrow(NotFoundException);
    });

    test('should return signer when found', async () => {
      const signer = buildSigner();
      (signerRepository.findOne as jest.Mock).mockResolvedValue(signer);
      await expect(service.findByToken('token-x')).resolves.toEqual(signer);
    });
  });

  describe('acceptSignature', () => {
    test('should reject already signed signer', async () => {
      const signer = buildSigner({ status: SignerStatus.SIGNED });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);

      await expect(
        service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject completed envelope', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const envelope = buildEnvelope({ status: EnvelopeStatus.COMPLETED });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(envelope);

      await expect(
        service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject expired envelope', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const envelope = buildEnvelope({ expiresAt: new Date('2020-01-01T00:00:00.000Z') });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(envelope);

      await expect(
        service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(BadRequestException);
    });

    test('should sign and emit event, without finalizing when not all signed', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const saved = buildSigner({
        status: SignerStatus.SIGNED,
        signedAt: new Date('2026-01-02T00:00:00.000Z'),
        verifiedAt: new Date('2026-01-01T12:00:00.000Z'),
      });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      jest.spyOn(service, 'areAllSignersSigned').mockResolvedValue(false);
      const finalizeSpy = jest.spyOn(
        service as unknown as { finalizeEnvelope: (envelopeId: string, tenantId: string) => Promise<void> },
        'finalizeEnvelope'
      ).mockResolvedValue();

      const result = await service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result.status).toBe(SignerStatus.SIGNED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_SIGNATURE_COMPLETED,
        expect.objectContaining({
          documentId: 'env-1',
          tenantId: 'tenant-1',
          signerId: saved.id,
        }) as SignatureCompletedEvent
      );
      expect(finalizeSpy).not.toHaveBeenCalled();
    });

    test('should finalize envelope when all signers signed', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const saved = buildSigner({ status: SignerStatus.SIGNED, verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      jest.spyOn(service, 'areAllSignersSigned').mockResolvedValue(true);
      const finalizeSpy = jest.spyOn(
        service as unknown as { finalizeEnvelope: (envelopeId: string, tenantId: string) => Promise<void> },
        'finalizeEnvelope'
      ).mockResolvedValue();

      await service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(finalizeSpy).toHaveBeenCalledWith('env-1', 'tenant-1');
    });
  });

  describe('areAllSignersSigned', () => {
    test('should return false when no signers', async () => {
      (signerRepository.find as jest.Mock).mockResolvedValue([]);
      await expect(service.areAllSignersSigned('env-1', 'tenant-1')).resolves.toBe(false);
    });

    test('should return true when all signed', async () => {
      const signed = buildSigner({ status: SignerStatus.SIGNED });
      (signerRepository.find as jest.Mock).mockResolvedValue([signed]);
      await expect(service.areAllSignersSigned('env-1', 'tenant-1')).resolves.toBe(true);
    });
  });

  describe('sendEnvelope', () => {
    test('should reject when no signers', async () => {
      const envelope = buildEnvelope({ signingMode: SigningMode.PARALLEL });
      envelopesService.findOne.mockResolvedValue(envelope);
      documentsService.findByEnvelope.mockResolvedValue([buildDocument()]);
      (signerRepository.find as jest.Mock).mockResolvedValue([]);

      await expect(service.sendEnvelope('tenant-1', 'env-1')).rejects.toThrow(
        BadRequestException
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
      (signerRepository.find as jest.Mock).mockResolvedValue(signers);
      (signerRepository.save as jest.Mock).mockResolvedValue([signers[0]]);
      notificationsService.sendSignatureInvite.mockResolvedValue('job-1');

      const result = await service.sendEnvelope('tenant-1', 'env-1');

      expect(result.notified).toEqual(['signer-1']);
      expect(documentsService.setStatus).toHaveBeenCalledWith(
        'doc-1',
        'tenant-1',
        DocumentStatus.PENDING_SIGNATURES
      );
      expect(envelopesService.setStatus).toHaveBeenCalledWith(
        'env-1',
        'tenant-1',
        EnvelopeStatus.PENDING_SIGNATURES
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_SENT,
        expect.objectContaining({
          documentId: 'env-1',
          tenantId: 'tenant-1',
          signingMode: SigningMode.SEQUENTIAL,
        })
      );
    });
  });
});
