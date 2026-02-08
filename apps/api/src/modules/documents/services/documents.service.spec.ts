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
import { Document, DocumentStatus, SigningMode } from '../entities/document.entity';
import { DocumentsService } from './documents.service';

const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc-1',
  tenantId: 'tenant-1',
  title: 'Agreement',
  originalFileKey: 'original.pdf',
  finalFileKey: null,
  originalHash: 'hash-original',
  finalHash: null,
  status: DocumentStatus.DRAFT,
  signingMode: SigningMode.PARALLEL,
  expiresAt: null,
  version: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  reminderInterval: 'none',
  signingLanguage: 'pt-br',
  closureMode: 'automatic',
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
    test('should store file, save document, and emit event', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const file = Buffer.from('pdf-content');
      const hash = sha256(file);
      const key = `tenants/tenant-1/documents/1700000000000-${hash.slice(0, 16)}.pdf`;
      const created = buildDocument({
        originalFileKey: key,
        originalHash: hash,
        status: DocumentStatus.DRAFT,
      });
      const saved = buildDocument({
        id: 'doc-2',
        originalFileKey: key,
        originalHash: hash,
        status: DocumentStatus.DRAFT,
      });
      (documentRepository.create as jest.Mock).mockReturnValue(created);
      (documentRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create(
        'tenant-1',
        { title: 'Agreement', expiresAt: '2026-12-31T23:59:59.000Z' },
        file
      );

      expect(storage.put).toHaveBeenCalledWith(key, file);
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
      nowSpy.mockRestore();
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

      const result = await service.create('tenant-1', { title: 'Draft' });

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
    test('should store file and update document metadata', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      const document = buildDocument();
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      const buffer = Buffer.from('updated');
      const hash = sha256(buffer);
      const key = `tenants/tenant-1/documents/doc-1/original-1700000000000-${hash.slice(0, 16)}.pdf`;
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        originalFileKey: key,
        originalHash: hash,
        finalFileKey: null,
        finalHash: null,
        status: DocumentStatus.DRAFT,
      });

      const result = await service.updateOriginalFile('doc-1', 'tenant-1', buffer);

      expect(storage.put).toHaveBeenCalledWith(key, buffer);
      expect(result.originalFileKey).toBe(key);
      expect(result.originalHash).toBe(hash);
      expect(result.status).toBe(DocumentStatus.DRAFT);
      nowSpy.mockRestore();
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
    test('should update expiresAt when provided', async () => {
      const document = buildDocument({ expiresAt: null });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      (documentRepository.save as jest.Mock).mockResolvedValue({
        ...document,
        title: 'Updated',
        expiresAt: new Date('2026-12-31T23:59:59.000Z'),
      });

      const result = await service.update('doc-1', 'tenant-1', {
        title: 'Updated',
        expiresAt: '2026-12-31T23:59:59.000Z',
      });

      expect(result.expiresAt?.toISOString()).toBe('2026-12-31T23:59:59.000Z');
    });

    test('should keep expiresAt when not provided', async () => {
      const existingDate = new Date('2026-01-01T00:00:00.000Z');
      const document = buildDocument({ expiresAt: existingDate });
      jest.spyOn(service, 'findOne').mockResolvedValue(document);
      (documentRepository.save as jest.Mock).mockResolvedValue(document);

      const result = await service.update('doc-1', 'tenant-1', { title: 'Updated' });

      expect(result.expiresAt).toBe(existingDate);
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

      const expectedKey = `tenants/tenant-1/documents/doc-1/final-v2.pdf`;
      expect(storage.put).toHaveBeenCalledWith(expectedKey, buffer);
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
});
