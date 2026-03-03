import { AuditService } from './audit.service';
import type { Repository } from 'typeorm';
import type { AuditLog } from '../entities/audit-log.entity';

function makeRepo(
  overrides: Partial<{
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    manager: { query: jest.Mock };
  }> = {}
): jest.Mocked<Repository<AuditLog>> {
  return {
    find: jest.fn(),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'log-id', createdAt: new Date(), ...entity })),
    manager: {
      query: overrides.manager?.query ?? jest.fn(),
    },
    ...overrides,
  } as unknown as jest.Mocked<Repository<AuditLog>>;
}

describe('AuditService', () => {
  describe('log', () => {
    it('should create and persist an audit log entry', async () => {
      const repo = makeRepo();
      const service = new AuditService(repo);

      const dto = {
        tenantId: 'tenant-1',
        eventType: 'document.completed',
        entityType: 'document',
        entityId: 'doc-1',
        actorId: null,
        actorType: null,
        metadata: { completedAt: '2026-01-01T00:00:00.000Z' },
      };

      await service.log(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findByEntity', () => {
    it('should query audit logs by entity and tenant', async () => {
      const repo = makeRepo();
      (repo.find as jest.Mock).mockResolvedValue([]);
      const service = new AuditService(repo);

      await service.findByEntity('tenant-1', 'document', 'doc-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', entityType: 'document', entityId: 'doc-1' },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('findHistory', () => {
    const makeRawRow = (overrides: Partial<{
      id: string;
      occurredAt: Date;
      eventType: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown> | null;
      documentTitle: string | null;
      envelopeTitle: string | null;
      actorName: string | null;
      actorEmail: string | null;
    }> = {}) => ({
      id: 'log-1',
      occurredAt: new Date('2026-01-01T10:00:00.000Z'),
      eventType: 'signature.completed',
      entityType: 'signer',
      entityId: 'signer-1',
      metadata: { documentId: 'doc-1' },
      documentTitle: 'Contrato X',
      envelopeTitle: 'Envelope X',
      actorName: 'Rafael',
      actorEmail: 'rafael@example.com',
      ...overrides,
    });

    it('should return paginated history with default page and limit', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([makeRawRow()])
        .mockResolvedValueOnce([{ total: '1' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should map raw row to HistoryItem with correct fields', async () => {
      const row = makeRawRow();
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([{ total: '1' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', {});
      const item = result.data[0];

      expect(item).toMatchObject({
        id: 'log-1',
        occurredAt: '2026-01-01T10:00:00.000Z',
        eventType: 'signature.completed',
        entityType: 'signer',
        entityId: 'signer-1',
        documentTitle: 'Contrato X',
        envelopeTitle: 'Envelope X',
        actorName: 'Rafael',
        actorEmail: 'rafael@example.com',
        summary: 'Signer signed document',
      });
    });

    it('should cap limit at 100', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', { limit: 999 });

      expect(result.meta.limit).toBe(100);
    });

    it('should calculate totalPages correctly', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '45' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', { limit: 20 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should include eventType filter in query when provided', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      await service.findHistory('tenant-1', { eventType: 'signature.completed' });

      const calledSql = mockQuery.mock.calls[0][0] as string;
      expect(calledSql).toContain('event_type');
    });

    it('should include date range filters when provided', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      await service.findHistory('tenant-1', {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
      });

      const calledSql = mockQuery.mock.calls[0][0] as string;
      expect(calledSql).toContain('created_at >=');
      expect(calledSql).toContain('created_at <=');
    });

    it('should include search filter in query when provided', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      await service.findHistory('tenant-1', { search: 'Contrato' });

      const calledSql = mockQuery.mock.calls[0][0] as string;
      expect(calledSql).toContain('ILIKE');
    });

    it('should use fallback summary for unknown event types', async () => {
      const row = makeRawRow({ eventType: 'unknown.event' });
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([{ total: '1' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', {});

      expect(result.data[0]?.summary).toBe('unknown.event');
    });

    it('should return empty data with zero total when no results', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistory('tenant-1', {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findHistoryByDocuments', () => {
    const makeRawDocumentRow = (overrides: Partial<{
      documentId: string;
      documentTitle: string | null;
      documentStatus: string | null;
      lastActivityAt: Date;
      eventCount: string;
    }> = {}) => ({
      documentId: 'doc-1',
      documentTitle: 'Contrato X',
      documentStatus: 'completed',
      lastActivityAt: new Date('2026-01-01T10:00:00.000Z'),
      eventCount: '3',
      ...overrides,
    });

    it('should return grouped documents with correct shape', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([makeRawDocumentRow()])
        .mockResolvedValueOnce([{ total: '1' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistoryByDocuments('tenant-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        documentId: 'doc-1',
        documentTitle: 'Contrato X',
        documentStatus: 'completed',
        occurredAt: undefined,
        eventCount: 3,
      });
      expect(result.data[0]?.lastActivityAt).toBe('2026-01-01T10:00:00.000Z');
    });

    it('should return correct pagination meta', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([makeRawDocumentRow()])
        .mockResolvedValueOnce([{ total: '1' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistoryByDocuments('tenant-1', { page: 1, limit: 10 });

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should include search filter in SQL when provided', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      await service.findHistoryByDocuments('tenant-1', { search: 'Contrato' });

      const calledSql = mockQuery.mock.calls[0][0] as string;
      expect(calledSql).toContain('ILIKE');
    });

    it('should return empty data with zero total when no documents found', async () => {
      const mockQuery = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findHistoryByDocuments('tenant-1', {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findDocumentEvents', () => {
    const makeRawEventRow = (overrides: Partial<{
      id: string;
      occurredAt: Date;
      eventType: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown> | null;
      documentTitle: string | null;
      actorName: string | null;
      actorEmail: string | null;
    }> = {}) => ({
      id: 'log-1',
      occurredAt: new Date('2026-01-01T10:00:00.000Z'),
      eventType: 'document.completed',
      entityType: 'document',
      entityId: 'doc-1',
      metadata: { completedAt: '2026-01-01T10:00:00.000Z' },
      documentTitle: 'Contrato X',
      actorName: null,
      actorEmail: null,
      ...overrides,
    });

    it('should return events for a document with correct shape', async () => {
      const mockQuery = jest.fn().mockResolvedValueOnce([makeRawEventRow()]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findDocumentEvents('tenant-1', 'doc-1');

      expect(result.documentId).toBe('doc-1');
      expect(result.documentTitle).toBe('Contrato X');
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        id: 'log-1',
        occurredAt: '2026-01-01T10:00:00.000Z',
        eventType: 'document.completed',
        entityType: 'document',
        entityId: 'doc-1',
        summary: 'Document completed',
      });
    });

    it('should resolve documentTitle from first event with non-null title', async () => {
      const rows = [
        makeRawEventRow({ documentTitle: null, eventType: 'signature.completed', entityType: 'signer' }),
        makeRawEventRow({ documentTitle: 'Contrato X', eventType: 'document.completed' }),
      ];
      const mockQuery = jest.fn().mockResolvedValueOnce(rows);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findDocumentEvents('tenant-1', 'doc-1');

      expect(result.documentTitle).toBe('Contrato X');
    });

    it('should return null documentTitle when no events have a title', async () => {
      const mockQuery = jest.fn().mockResolvedValueOnce([makeRawEventRow({ documentTitle: null })]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findDocumentEvents('tenant-1', 'doc-1');

      expect(result.documentTitle).toBeNull();
    });

    it('should return empty events list when no records found', async () => {
      const mockQuery = jest.fn().mockResolvedValueOnce([]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      const result = await service.findDocumentEvents('tenant-1', 'doc-1');

      expect(result.events).toHaveLength(0);
      expect(result.documentTitle).toBeNull();
    });

    it('should query events by both document entity and signer metadata', async () => {
      const mockQuery = jest.fn().mockResolvedValueOnce([]);

      const repo = makeRepo({ manager: { query: mockQuery } });
      const service = new AuditService(repo);

      await service.findDocumentEvents('tenant-1', 'doc-1');

      const calledSql = mockQuery.mock.calls[0][0] as string;
      expect(calledSql).toContain("entity_type = 'document'");
      expect(calledSql).toContain("entity_type = 'signer'");
      expect(calledSql).toContain("documentId");
    });
  });
});
