import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  DocumentEventsQueryDto,
  DocumentHistoryQueryDto,
} from '../dto/document-history-query.dto';
import type {
  DocumentEvent,
  DocumentEventsResponse,
  DocumentHistoryResponse,
  DocumentHistorySummary,
} from '../dto/document-history-response.dto';
import type { HistoryQueryDto } from '../dto/history-query.dto';
import type { HistoryItem, HistoryResponse } from '../dto/history-response.dto';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorType?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SUMMARY_MAP: Record<string, string> = {
  'signature.completed': 'Signer signed document',
  'document.completed': 'Document completed',
  'document.expired': 'Document expired',
  'user.login.success': 'User logged in',
  'user.login.failed': 'Login attempt failed',
  'user.logout': 'User logged out',
};

function buildSummary(eventType: string): string {
  return SUMMARY_MAP[eventType] ?? eventType;
}

interface RawHistoryRow {
  id: string;
  occurredAt: Date | string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  documentTitle: string | null;
  envelopeTitle: string | null;
  actorName: string | null;
  actorEmail: string | null;
}

interface RawDocumentHistoryRow {
  documentId: string;
  documentTitle: string | null;
  documentStatus: string | null;
  lastActivityAt: Date | string;
  eventCount: string;
}

interface RawDocumentEventRow {
  id: string;
  occurredAt: Date | string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  documentTitle: string | null;
  actorName: string | null;
  actorEmail: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const entry = this.auditRepository.create(dto);
    return this.auditRepository.save(entry);
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }

  async findHistory(tenantId: string, query: HistoryQueryDto): Promise<HistoryResponse> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const params: unknown[] = [tenantId];
    const conditions: string[] = ['al.tenant_id = $1'];

    if (query.eventType) {
      params.push(query.eventType);
      conditions.push(`al.event_type = $${params.length}`);
    }

    if (query.from) {
      params.push(query.from);
      conditions.push(`al.created_at >= $${params.length}`);
    }

    if (query.to) {
      params.push(query.to);
      conditions.push(`al.created_at <= $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search}%`);
      const idx = params.length;
      conditions.push(
        `(doc.title ILIKE $${idx} OR sig_doc.title ILIKE $${idx} OR env_doc.title ILIKE $${idx} OR env.title ILIKE $${idx})`
      );
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      FROM audit_logs al
      LEFT JOIN documents doc
        ON al.entity_type = 'document'
        AND doc.id::text = al.entity_id
        AND doc.tenant_id = al.tenant_id
      LEFT JOIN envelopes env_doc
        ON doc.envelope_id = env_doc.id
      LEFT JOIN envelopes env
        ON al.entity_type = 'envelope'
        AND env.id::text = al.entity_id
        AND env.tenant_id = al.tenant_id
      LEFT JOIN documents sig_doc
        ON al.entity_type = 'signer'
        AND sig_doc.id::text = (al.metadata->>'documentId')
        AND sig_doc.tenant_id = al.tenant_id
      LEFT JOIN users usr
        ON al.actor_type = 'user'
        AND usr.id::text = al.actor_id
        AND usr.tenant_id = al.tenant_id
      LEFT JOIN signers sgn
        ON al.actor_type = 'signer'
        AND sgn.id::text = al.actor_id
        AND sgn.tenant_id = al.tenant_id
      WHERE ${whereClause}
    `;

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT
        al.id,
        al.created_at AS "occurredAt",
        al.event_type AS "eventType",
        al.entity_type AS "entityType",
        al.entity_id AS "entityId",
        al.metadata AS metadata,
        COALESCE(doc.title, sig_doc.title) AS "documentTitle",
        COALESCE(env_doc.title, env.title) AS "envelopeTitle",
        COALESCE(usr.name, sgn.name) AS "actorName",
        COALESCE(usr.email, sgn.email, al.metadata->>'email') AS "actorEmail"
      ${baseQuery}
      ORDER BY al.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;

    const [rows, countResult] = await Promise.all([
      this.auditRepository.manager.query<RawHistoryRow[]>(dataQuery, dataParams),
      this.auditRepository.manager.query<[{ total: string }]>(countQuery, params),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    const data: HistoryItem[] = rows.map((row) => ({
      id: row.id,
      occurredAt:
        row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      documentTitle: row.documentTitle ?? null,
      envelopeTitle: row.envelopeTitle ?? null,
      actorName: row.actorName ?? null,
      actorEmail: row.actorEmail ?? null,
      summary: buildSummary(row.eventType),
      metadata: row.metadata,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDocumentHistory(
    tenantId: string,
    query: DocumentHistoryQueryDto
  ): Promise<DocumentHistoryResponse> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const params: unknown[] = [tenantId];
    const conditions: string[] = ['doc.tenant_id = $1'];

    if (query.search) {
      params.push(`%${query.search}%`);
      conditions.push(`doc.title ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const baseQuery = `
      FROM documents doc
      JOIN audit_logs al
        ON al.tenant_id = doc.tenant_id
        AND (
          (al.entity_type = 'document' AND al.entity_id = doc.id::text)
          OR (al.entity_type = 'signer' AND al.metadata->>'documentId' = doc.id::text)
        )
      WHERE ${whereClause}
    `;

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT
        doc.id AS "documentId",
        doc.title AS "documentTitle",
        doc.status AS "documentStatus",
        MAX(al.created_at) AS "lastActivity",
        COUNT(al.id)::int AS "eventCount"
      ${baseQuery}
      GROUP BY doc.id, doc.title, doc.status
      ORDER BY "lastActivity" DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const countQuery = `SELECT COUNT(DISTINCT doc.id) AS total ${baseQuery}`;

    interface RawDocumentRow {
      documentId: string;
      documentTitle: string;
      documentStatus: string | null;
      lastActivity: Date | string;
      eventCount: number;
    }

    const [rows, countResult] = await Promise.all([
      this.auditRepository.manager.query<RawDocumentRow[]>(dataQuery, dataParams),
      this.auditRepository.manager.query<[{ total: string }]>(countQuery, params),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    const data: DocumentHistorySummary[] = rows.map((row) => ({
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      documentStatus: row.documentStatus,
      lastActivity:
        row.lastActivity instanceof Date
          ? row.lastActivity.toISOString()
          : String(row.lastActivity),
      eventCount: row.eventCount,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDocumentEvents(
    tenantId: string,
    documentId: string,
    query: DocumentEventsQueryDto
  ): Promise<DocumentEventsResponse> {
    const docExists = await this.auditRepository.manager.query<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM documents WHERE id = $1 AND tenant_id = $2) AS exists`,
      [documentId, tenantId]
    );

    if (!docExists[0]?.exists) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const baseQuery = `
      FROM audit_logs al
      WHERE al.tenant_id = $1
        AND (
          (al.entity_type = 'document' AND al.entity_id = $2)
          OR (al.entity_type = 'signer' AND al.metadata->>'documentId' = $2)
        )
    `;

    const dataParams = [tenantId, documentId, limit, offset];
    const dataQuery = `
      SELECT
        al.id,
        al.event_type AS "eventType",
        al.created_at AS "occurredAt",
        al.actor_id AS "actorId",
        al.actor_type AS "actorType",
        al.metadata
      ${baseQuery}
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
    const countParams = [tenantId, documentId];

    interface RawEventRow {
      id: string;
      eventType: string;
      occurredAt: Date | string;
      actorId: string | null;
      actorType: string | null;
      metadata: Record<string, unknown> | null;
    }

    const [rows, countResult] = await Promise.all([
      this.auditRepository.manager.query<RawEventRow[]>(dataQuery, dataParams),
      this.auditRepository.manager.query<[{ total: string }]>(countQuery, countParams),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    const data: DocumentEvent[] = rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      occurredAt:
        row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
      actorId: row.actorId,
      actorType: row.actorType,
      metadata: row.metadata,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
