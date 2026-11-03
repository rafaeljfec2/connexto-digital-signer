import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentIntegrityAuditService } from './document-integrity-audit.service';
import type { Repository } from 'typeorm';

const buildDocument = (overrides?: Partial<Document>): Document =>
  ({
    id: 'doc-1',
    tenantId: 'tenant-1',
    envelopeId: 'env-1',
    title: 'Contract',
    status: DocumentStatus.COMPLETED,
    finalFileKey: null,
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }) as Document;

describe('DocumentIntegrityAuditService', () => {
  let documentRepository: {
    findAndCount: jest.Mock;
  };
  let service: DocumentIntegrityAuditService;

  beforeEach(() => {
    documentRepository = {
      findAndCount: jest.fn(),
    };
    service = new DocumentIntegrityAuditService(
      documentRepository as unknown as Repository<Document>,
    );
  });

  test('should list completed documents missing finalFileKey for tenant', async () => {
    documentRepository.findAndCount.mockResolvedValue([
      [buildDocument({ id: 'doc-a', envelopeId: 'env-a' })],
      1,
    ]);

    const result = await service.findCompletedWithoutFinalFile('tenant-1');

    expect(result.total).toBe(1);
    expect(result.records).toEqual([
      expect.objectContaining({
        documentId: 'doc-a',
        envelopeId: 'env-a',
      }),
    ]);
    expect(documentRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          status: DocumentStatus.COMPLETED,
        }),
        take: 100,
      }),
    );
  });

  test('should cap audit limit at 500', async () => {
    documentRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findCompletedWithoutFinalFile('tenant-1', 9999);

    expect(documentRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 }),
    );
  });
});
