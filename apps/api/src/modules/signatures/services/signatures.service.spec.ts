import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SignaturesService } from './signatures.service';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { Document, DocumentStatus, SigningMode } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { EVENT_SIGNATURE_COMPLETED, EVENT_DOCUMENT_SENT } from '@connexto/events';
import type { SignatureCompletedEvent } from '@connexto/events';
import { SignatureFieldsService } from './signature-fields.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { SignatureFieldType } from '../entities/signature-field.entity';

const buildSigner = (overrides?: Partial<Signer>): Signer => ({
  id: 'signer-1',
  tenantId: 'tenant-1',
  documentId: 'doc-1',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  status: SignerStatus.PENDING,
  accessToken: 'token-1',
  cpf: null,
  birthDate: null,
  requestCpf: false,
  authMethod: 'email',
  reminderCount: 0,
  order: null,
  notifiedAt: null,
  signedAt: null,
  ipAddress: null,
  userAgent: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc-1',
  tenantId: 'tenant-1',
  title: 'Agreement',
  originalFileKey: 'original.pdf',
  finalFileKey: null,
  originalHash: 'hash-original',
  finalHash: null,
  status: DocumentStatus.PENDING_SIGNATURES,
  signingMode: SigningMode.PARALLEL,
  expiresAt: null,
  reminderInterval: 'none',
  signingLanguage: 'pt-br',
  closureMode: 'automatic',
  version: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('SignaturesService', () => {
  let service: SignaturesService;
  let signerRepository: Repository<Signer>;
  let documentsService: jest.Mocked<DocumentsService>;
  let eventEmitter: EventEmitter2;
  let pdfService: jest.Mocked<PdfService>;
  let fieldsService: jest.Mocked<SignatureFieldsService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(() => {
    signerRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<Signer>;
    documentsService = {
      findOne: jest.fn(),
      getOriginalFile: jest.fn(),
      setFinalPdf: jest.fn(),
      setStatus: jest.fn(),
    } as unknown as jest.Mocked<DocumentsService>;
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
    } as unknown as jest.Mocked<SignatureFieldsService>;
    notificationsService = {
      sendSignatureInvite: jest.fn(),
      buildSignatureInvite: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    service = new SignaturesService(
      signerRepository,
      documentsService,
      eventEmitter,
      pdfService,
      fieldsService,
      notificationsService
    );
  });

  describe('addSigner', () => {
    test('should create signer and return saved signer', async () => {
      const document = buildDocument({ signingMode: SigningMode.PARALLEL });
      const created = buildSigner({ accessToken: 'token-generated' });
      const saved = buildSigner({ id: 'signer-2', accessToken: 'token-generated' });
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.create as jest.Mock).mockReturnValue(created);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      const result = await service.addSigner('tenant-1', 'doc-1', {
        name: 'Jane',
        email: 'jane@acme.com',
      });

      expect(result).toEqual(saved);
      expect(documentsService.findOne).toHaveBeenCalledWith('doc-1', 'tenant-1');
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

    test('should reject completed document', async () => {
      const signer = buildSigner();
      const document = buildDocument({ status: DocumentStatus.COMPLETED });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      documentsService.findOne.mockResolvedValue(document);

      await expect(
        service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject expired document', async () => {
      const signer = buildSigner();
      const document = buildDocument({ expiresAt: new Date('2020-01-01T00:00:00.000Z') });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      documentsService.findOne.mockResolvedValue(document);

      await expect(
        service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(BadRequestException);
    });

    test('should sign and emit event, without finalizing when not all signed', async () => {
      const signer = buildSigner();
      const saved = buildSigner({
        status: SignerStatus.SIGNED,
        signedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      const document = buildDocument();
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      jest.spyOn(service, 'areAllSignersSigned').mockResolvedValue(false);
      const finalizeSpy = jest.spyOn(
        service as unknown as { finalizeDocument: (documentId: string, tenantId: string) => Promise<void> },
        'finalizeDocument'
      ).mockResolvedValue();

      const result = await service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result.status).toBe(SignerStatus.SIGNED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_SIGNATURE_COMPLETED,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: 'tenant-1',
          signerId: saved.id,
        }) as SignatureCompletedEvent
      );
      expect(finalizeSpy).not.toHaveBeenCalled();
    });

    test('should notify next signer when sequential and not all signed', async () => {
      const signer = buildSigner();
      const saved = buildSigner({
        status: SignerStatus.SIGNED,
        signedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      const document = buildDocument({ signingMode: SigningMode.SEQUENTIAL });
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      jest.spyOn(service, 'areAllSignersSigned').mockResolvedValue(false);
      const notifySpy = jest.spyOn(
        service as unknown as {
          notifyNextSigner: (documentId: string, tenantId: string, title: string) => Promise<void>;
        },
        'notifyNextSigner'
      ).mockResolvedValue();

      await service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(notifySpy).toHaveBeenCalledWith('doc-1', 'tenant-1', document.title);
    });

    test('should finalize document when all signers signed', async () => {
      const signer = buildSigner();
      const saved = buildSigner({ status: SignerStatus.SIGNED });
      const document = buildDocument();
      jest.spyOn(service, 'findByToken').mockResolvedValue(signer);
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      jest.spyOn(service, 'areAllSignersSigned').mockResolvedValue(true);
      const finalizeSpy = jest.spyOn(
        service as unknown as { finalizeDocument: (documentId: string, tenantId: string) => Promise<void> },
        'finalizeDocument'
      ).mockResolvedValue();

      await service.acceptSignature('token-1', { consent: 'ok', fields: [] }, {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(finalizeSpy).toHaveBeenCalledWith('doc-1', 'tenant-1');
    });
  });

  describe('areAllSignersSigned', () => {
    test('should return false when no signers', async () => {
      (signerRepository.find as jest.Mock).mockResolvedValue([]);
      await expect(service.areAllSignersSigned('doc-1', 'tenant-1')).resolves.toBe(false);
    });

    test('should return true when all signed', async () => {
      const signed = buildSigner({ status: SignerStatus.SIGNED });
      (signerRepository.find as jest.Mock).mockResolvedValue([signed]);
      await expect(service.areAllSignersSigned('doc-1', 'tenant-1')).resolves.toBe(true);
    });
  });

  describe('finalizeDocument', () => {
    test('should embed signatures, append evidence page and persist final pdf', async () => {
      const signerA = buildSigner({ signedAt: new Date('2026-01-02T00:00:00.000Z') });
      const signerB = buildSigner({
        id: 'signer-2',
        email: 'john@acme.com',
        name: 'John Doe',
        signedAt: new Date('2026-01-03T00:00:00.000Z'),
      });
      const document = buildDocument({ title: 'Agreement' });
      const original = Buffer.from('pdf');
      const withSignatures = Buffer.from('pdf-with-signatures');
      const finalized = Buffer.from('final');
      documentsService.findOne.mockResolvedValue(document);
      documentsService.getOriginalFile.mockResolvedValue(original);
      fieldsService.findByDocument.mockResolvedValue([]);
      (signerRepository.find as jest.Mock).mockResolvedValue([signerA, signerB]);
      pdfService.embedSignatures.mockResolvedValue(withSignatures);
      pdfService.appendEvidencePage.mockResolvedValue(finalized);

      const servicePrivate = service as unknown as {
        finalizeDocument: (documentId: string, tenantId: string) => Promise<void>;
      };
      await servicePrivate.finalizeDocument('doc-1', 'tenant-1');

      expect(pdfService.embedSignatures).toHaveBeenCalledWith(original, []);
      expect(pdfService.appendEvidencePage).toHaveBeenCalledWith(
        withSignatures,
        [
          {
            name: signerA.name,
            email: signerA.email,
            signedAt: signerA.signedAt?.toISOString() ?? '',
            ipAddress: signerA.ipAddress,
            userAgent: signerA.userAgent,
          },
          {
            name: signerB.name,
            email: signerB.email,
            signedAt: signerB.signedAt?.toISOString() ?? '',
            ipAddress: signerB.ipAddress,
            userAgent: signerB.userAgent,
          },
        ],
        document.title
      );
      expect(documentsService.setFinalPdf).toHaveBeenCalledWith('doc-1', 'tenant-1', finalized);
    });
  });

  describe('sendDocument', () => {
    test('should reject when no signers', async () => {
      const document = buildDocument({ signingMode: SigningMode.PARALLEL });
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.find as jest.Mock).mockResolvedValue([]);
      fieldsService.findByDocument.mockResolvedValue([
        {
          id: 'field-1',
          tenantId: 'tenant-1',
          documentId: 'doc-1',
          signerId: 'signer-1',
          type: SignatureFieldType.SIGNATURE,
          page: 1,
          x: 0.1,
          y: 0.1,
          width: 0.2,
          height: 0.1,
          required: true,
          value: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(service.sendDocument('tenant-1', 'doc-1')).rejects.toThrow(
        BadRequestException
      );
    });

    test('should notify first signer when sequential', async () => {
      const document = buildDocument({ signingMode: SigningMode.SEQUENTIAL });
      const signers = [
        buildSigner({ id: 'signer-1', order: 1 }),
        buildSigner({ id: 'signer-2', order: 2, email: 'two@acme.com' }),
      ];
      documentsService.findOne.mockResolvedValue(document);
      (signerRepository.find as jest.Mock).mockResolvedValue(signers);
      (signerRepository.save as jest.Mock).mockResolvedValue([signers[0]]);
      fieldsService.findByDocument.mockResolvedValue([
        {
          id: 'field-1',
          tenantId: 'tenant-1',
          documentId: 'doc-1',
          signerId: 'signer-1',
          type: SignatureFieldType.SIGNATURE,
          page: 1,
          x: 0.1,
          y: 0.1,
          width: 0.2,
          height: 0.1,
          required: true,
          value: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      notificationsService.sendSignatureInvite.mockResolvedValue('job-1');

      const result = await service.sendDocument('tenant-1', 'doc-1');

      expect(result.notified).toEqual(['signer-1']);
      expect(documentsService.setStatus).toHaveBeenCalledWith(
        'doc-1',
        'tenant-1',
        DocumentStatus.PENDING_SIGNATURES
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_SENT,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: 'tenant-1',
          signingMode: SigningMode.SEQUENTIAL,
        })
      );
    });
  });
});
