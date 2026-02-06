import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SignaturesService } from './signatures.service';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { PdfService } from '../../../shared/pdf/pdf.service';
import { EVENT_SIGNATURE_COMPLETED, EVENT_SIGNER_ADDED } from '@connexto/events';
import type { SignatureCompletedEvent, SignerAddedEvent } from '@connexto/events';

const buildSigner = (overrides?: Partial<Signer>): Signer => ({
  id: 'signer-1',
  tenantId: 'tenant-1',
  documentId: 'doc-1',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  status: SignerStatus.PENDING,
  accessToken: 'token-1',
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
  expiresAt: null,
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
    } as unknown as jest.Mocked<DocumentsService>;
    eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    pdfService = {
      appendEvidencePage: jest.fn(),
      computeHash: jest.fn(),
    } as unknown as jest.Mocked<PdfService>;
    service = new SignaturesService(
      signerRepository,
      documentsService,
      eventEmitter,
      pdfService
    );
  });

  describe('addSigner', () => {
    test('should create signer, emit event, and return saved signer', async () => {
      const document = buildDocument();
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
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_SIGNER_ADDED,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: 'tenant-1',
          signerId: 'signer-2',
          signerEmail: 'jane@acme.com',
          signerName: 'Jane Doe',
          documentTitle: 'Agreement',
          accessToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        }) as SignerAddedEvent
      );
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
        service.acceptSignature('token-1', { consent: 'ok' }, {
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
        service.acceptSignature('token-1', { consent: 'ok' }, {
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
        service.acceptSignature('token-1', { consent: 'ok' }, {
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

      const result = await service.acceptSignature('token-1', { consent: 'ok' }, {
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

      await service.acceptSignature('token-1', { consent: 'ok' }, {
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
    test('should append evidence page and persist final pdf', async () => {
      const signerA = buildSigner({ signedAt: new Date('2026-01-02T00:00:00.000Z') });
      const signerB = buildSigner({
        id: 'signer-2',
        email: 'john@acme.com',
        name: 'John Doe',
        signedAt: new Date('2026-01-03T00:00:00.000Z'),
      });
      const document = buildDocument({ title: 'Agreement' });
      const original = Buffer.from('pdf');
      const finalized = Buffer.from('final');
      documentsService.findOne.mockResolvedValue(document);
      documentsService.getOriginalFile.mockResolvedValue(original);
      (signerRepository.find as jest.Mock).mockResolvedValue([signerA, signerB]);
      pdfService.appendEvidencePage.mockResolvedValue(finalized);

      const servicePrivate = service as unknown as {
        finalizeDocument: (documentId: string, tenantId: string) => Promise<void>;
      };
      await servicePrivate.finalizeDocument('doc-1', 'tenant-1');

      expect(pdfService.appendEvidencePage).toHaveBeenCalledWith(
        original,
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
});
