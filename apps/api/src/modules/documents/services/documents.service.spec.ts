import type {
  DocumentCompletedEvent,
  DocumentCreatedEvent,
  DocumentExpiredEvent,
} from '@connexto/events';
import {
  EVENT_DOCUMENT_COMPLETED,
  EVENT_DOCUMENT_CREATED,
  EVENT_DOCUMENT_EXPIRED,
} from '@connexto/events';
import { sha256 } from '@connexto/shared';
import { Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Repository } from 'typeorm';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentsService } from './documents.service';

const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc-1',
  tenantId: 'tenant-1',
  envelopeId: 'env-1',
  title: 'Agreement',
  originalFileKey: 'original.pdf',
  finalFileKey: null,
  p7sFileKey: null,
  originalHash: 'hash-original',
  finalHash: null,
  mimeType: 'application/pdf',
  size: 1024,
  status: DocumentStatus.DRAFT,
  version: 1,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: Repository<Document>;
  let eventEmitter: EventEmitter2;
  let storage: jest.Mocked<S3StorageService>;

  beforeEach(() => {
    documentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<Document>;
    eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    storage = {
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    } as unknown as jest.Mocked<S3StorageService>;
    service = new DocumentsService(documentRepository, eventEmitter, storage, new Logger());
  });

  describe('create', () => {
    test('should validate file, store, save document, and emit event', async () => {
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const file = Buffer.concat([pdfHeader, Buffer.from('-content')]);
      const hash = sha256(file);
      const created = buildDocument({
        originalHash: hash,
        mimeType: 'application/pdf',
        size: file.length,
        status: DocumentStatus.DRAFT,
      });
      const saved = buildDocument({
        id: 'doc-2',
        originalHash: hash,
        mimeType: 'application/pdf',
        size: file.length,
        status: DocumentStatus.DRAFT,
      });
      (documentRepository.create as jest.Mock).mockReturnValue(created);
      (documentRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create(
        'tenant-1',
        { title: 'Agreement', envelopeId: 'env-1' },
        file
      );

      expect(storage.put).toHaveBeenCalledWith(
        expect.stringMatching(/^tenants\/tenant-1\/documents\/[\w-]+\/original\.pdf$/),
        file,
        'application/pdf',
      );
      expect(documentRepository.save).toHaveBeenCalledWith(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_CREATED,
        expect.objectContaining({
          documentId: 'doc-2',
          tenantId: 'tenant-1',
          title: 'Agreement',
          createdAt: saved.createdAt,
        }) as DocumentCreatedEvent
      );
      expect(result).toEqual(saved);
    });

    test('should create draft without file when no file provided', async () => {
      const created = buildDocument({
        title: 'Draft',
        originalFileKey: null,
        originalHash: null,
        status: DocumentStatus.DRAFT,
      });
      const saved = buildDocument({
        id: 'doc-3',
        title: 'Draft',
        originalFileKey: null,
        originalHash: null,
        status: DocumentStatus.DRAFT,
      });
      (documentRepository.create as jest.Mock).mockReturnValue(created);
      (documentRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create('tenant-1', { title: 'Draft', envelopeId: 'env-1' });

      expect(storage.put).not.toHaveBeenCalled();
      expect(documentRepository.save).toHaveBeenCalledWith(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_CREATED,
        expect.objectContaining({
          documentId: 'doc-3',
          tenantId: 'tenant-1',
          title: 'Draft',
        }) as DocumentCreatedEvent
      );
      expect(result.originalFileKey).toBeNull();
      expect(result.originalHash).toBeNull();
    });
  });

  describe('updateOriginalFile', () => {
    test('should validate, store file and update document metadata', async () => {
      const document = buildDocument();
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const buffer = Buffer.concat([pdfHeader, Buffer.from('-updated')]);
      const hash = sha256(buffer);
      const expectedKey = 'tenants/tenant-1/documents/doc-1/original.pdf';
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        originalFileKey: expectedKey,
        originalHash: hash,
        mimeType: 'application/pdf',
        size: buffer.length,
        finalFileKey: null,
        finalHash: null,
        status: DocumentStatus.DRAFT,
      });

      const result = await service.updateOriginalFile('doc-1', 'tenant-1', buffer);

      expect(storage.put).toHaveBeenCalledWith(expectedKey, buffer, 'application/pdf');
      expect(result.originalFileKey).toBe(expectedKey);
      expect(result.originalHash).toBe(hash);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.status).toBe(DocumentStatus.DRAFT);
    });

    test('should delete orphaned S3 key when extension changes', async () => {
      const document = buildDocument({
        originalFileKey: 'tenants/tenant-1/documents/doc-1/original.jpg',
      });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);

      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const buffer = Buffer.concat([pdfHeader, Buffer.from('-new')]);
      const expectedKey = 'tenants/tenant-1/documents/doc-1/original.pdf';

      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        originalFileKey: expectedKey,
        mimeType: 'application/pdf',
        size: buffer.length,
      });

      await service.updateOriginalFile('doc-1', 'tenant-1', buffer);

      expect(storage.delete).toHaveBeenCalledWith(
        'tenants/tenant-1/documents/doc-1/original.jpg',
      );
    });

    test('should not delete S3 key when extension stays the same', async () => {
      const document = buildDocument({
        originalFileKey: 'tenants/tenant-1/documents/doc-1/original.pdf',
      });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);

      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const buffer = Buffer.concat([pdfHeader, Buffer.from('-same')]);

      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        originalFileKey: 'tenants/tenant-1/documents/doc-1/original.pdf',
      });

      await service.updateOriginalFile('doc-1', 'tenant-1', buffer);

      expect(storage.delete).not.toHaveBeenCalled();
    });

    test('should not fail when orphan deletion throws', async () => {
      const document = buildDocument({
        originalFileKey: 'tenants/tenant-1/documents/doc-1/original.jpg',
      });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      storage.delete.mockRejectedValue(new Error('S3 error'));

      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      const buffer = Buffer.concat([pdfHeader, Buffer.from('-new')]);

      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        originalFileKey: 'tenants/tenant-1/documents/doc-1/original.pdf',
      });

      await expect(
        service.updateOriginalFile('doc-1', 'tenant-1', buffer),
      ).resolves.toBeDefined();
    });
  });

  describe('findOne', () => {
    test('should throw NotFoundException when missing', async () => {
      (documentRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('doc-1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    test('should return document when found', async () => {
      const document = buildDocument();
      (documentRepository.findOne as jest.Mock).mockResolvedValue(document);
      await expect(service.findOne('doc-1', 'tenant-1')).resolves.toEqual(document);
    });
  });

  describe('update', () => {
    test('should update title when provided', async () => {
      const document = buildDocument();
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        title: 'Updated',
      });

      const result = await service.update('doc-1', 'tenant-1', {
        title: 'Updated',
      });

      expect(result.title).toBe('Updated');
    });

    test('should update position when provided', async () => {
      const document = buildDocument({ position: 0 });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        position: 2,
      });

      const result = await service.update('doc-1', 'tenant-1', { position: 2 });

      expect(result.position).toBe(2);
    });
  });

  describe('setFinalPdf', () => {
    test('should store final pdf, update document, and emit event', async () => {
      const document = buildDocument({ version: 2 });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      const buffer = Buffer.from('final');
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        finalFileKey: 'final',
        finalHash: sha256(buffer),
        status: DocumentStatus.COMPLETED,
      });

      const result = await service.setFinalPdf('doc-1', 'tenant-1', buffer);

      const expectedKey = `tenants/tenant-1/documents/doc-1/signed.pdf`;
      expect(storage.put).toHaveBeenCalledWith(expectedKey, buffer, 'application/pdf');
      expect(result.status).toBe(DocumentStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_COMPLETED,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: 'tenant-1',
          completedAt: expect.any(Date),
        }) as DocumentCompletedEvent
      );
    });

    test('should store .p7s file and persist p7s key when provided', async () => {
      const document = buildDocument({ version: 2 });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      const finalBuffer = Buffer.from('final');
      const p7sBuffer = Buffer.from('p7s');
      const expectedP7sKey = 'tenants/tenant-1/documents/doc-1/signature.p7s';
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        finalFileKey: 'tenants/tenant-1/documents/doc-1/signed.pdf',
        p7sFileKey: expectedP7sKey,
        finalHash: sha256(finalBuffer),
        status: DocumentStatus.COMPLETED,
      });

      const result = await service.setFinalPdf('doc-1', 'tenant-1', finalBuffer, p7sBuffer);

      expect(storage.put).toHaveBeenCalledWith(expectedP7sKey, p7sBuffer, 'application/pkcs7-signature');
      expect(result.p7sFileKey).toBe(expectedP7sKey);
    });
  });

  describe('markExpired', () => {
    test('should mark document as expired and emit event', async () => {
      const document = buildDocument({ status: DocumentStatus.PENDING_SIGNATURES });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        status: DocumentStatus.EXPIRED,
      });

      const result = await service.markExpired('doc-1', 'tenant-1');

      expect(result.status).toBe(DocumentStatus.EXPIRED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_DOCUMENT_EXPIRED,
        expect.objectContaining({
          documentId: 'doc-1',
          tenantId: 'tenant-1',
          expiredAt: expect.any(Date),
        }) as DocumentExpiredEvent
      );
    });
  });

  describe('getOriginalFile', () => {
    test('should return file buffer', async () => {
      const document = buildDocument({ originalFileKey: 'origin.pdf' });
      const buffer = Buffer.from('data');
      storage.get.mockResolvedValue(buffer);

      await expect(service.getOriginalFile(document)).resolves.toEqual(buffer);
      expect(storage.get).toHaveBeenCalledWith('origin.pdf');
    });

    test('should throw NotFoundException when originalFileKey is null', async () => {
      const document = buildDocument({ originalFileKey: null });
      await expect(service.getOriginalFile(document)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFinalFile', () => {
    test('should return null when finalFileKey is null', async () => {
      const document = buildDocument({ finalFileKey: null });
      await expect(service.getFinalFile(document)).resolves.toBeNull();
    });

    test('should return buffer when finalFileKey exists', async () => {
      const document = buildDocument({ finalFileKey: 'final.pdf' });
      const buffer = Buffer.from('final');
      storage.get.mockResolvedValue(buffer);

      await expect(service.getFinalFile(document)).resolves.toEqual(buffer);
      expect(storage.get).toHaveBeenCalledWith('final.pdf');
    });
  });

  describe('getOriginalFileUrl', () => {
    test('should return presigned URL with mimeType and attachment disposition', async () => {
      const document = buildDocument({ originalFileKey: 'origin.pdf', mimeType: 'application/pdf' });
      storage.getSignedUrl.mockResolvedValue('https://s3.example.com/presigned');

      const result = await service.getOriginalFileUrl(document);

      expect(result.url).toBe('https://s3.example.com/presigned');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.expiresIn).toBe(300);
      expect(storage.getSignedUrl).toHaveBeenCalledWith('origin.pdf', 300, { disposition: 'attachment' });
    });

    test('should throw NotFoundException when originalFileKey is null', async () => {
      const document = buildDocument({ originalFileKey: null });
      await expect(service.getOriginalFileUrl(document)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFinalFileUrl', () => {
    test('should return null when finalFileKey is null', async () => {
      const document = buildDocument({ finalFileKey: null });
      await expect(service.getFinalFileUrl(document)).resolves.toBeNull();
    });

    test('should return presigned URL with attachment disposition when finalFileKey exists', async () => {
      const document = buildDocument({ finalFileKey: 'signed.pdf' });
      storage.getSignedUrl.mockResolvedValue('https://s3.example.com/signed');

      const result = await service.getFinalFileUrl(document);

      expect(result).not.toBeNull();
      expect(result!.url).toBe('https://s3.example.com/signed');
      expect(result!.expiresIn).toBe(300);
      expect(storage.getSignedUrl).toHaveBeenCalledWith('signed.pdf', 300, { disposition: 'attachment' });
    });
  });

  describe('getP7sFileUrl', () => {
    test('should return null when p7sFileKey is null', async () => {
      const document = buildDocument({ p7sFileKey: null });
      await expect(service.getP7sFileUrl(document)).resolves.toBeNull();
    });

    test('should return presigned URL when p7s file exists', async () => {
      const document = buildDocument({ p7sFileKey: 'signature.p7s' });
      storage.getSignedUrl.mockResolvedValue('https://s3.example.com/signature.p7s');

      const result = await service.getP7sFileUrl(document);

      expect(result).not.toBeNull();
      expect(result!.url).toBe('https://s3.example.com/signature.p7s');
      expect(result!.expiresIn).toBe(300);
      expect(storage.getSignedUrl).toHaveBeenCalledWith('signature.p7s', 300, { disposition: 'attachment' });
    });
  });
});
