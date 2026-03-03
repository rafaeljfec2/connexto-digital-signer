import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import type { HistoryQueryDto } from '../dto/history-query.dto';
import type {
  DocumentEventItem,
  DocumentEventsResponse,
  DocumentHistoryItem,
  DocumentHistoryResponse,
  HistoryItem,
  HistoryResponse,
} from '../dto/history-response.dto';

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

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
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
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
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

  async findHistoryByDocuments(
    tenantId: string,
    query: HistoryQueryDto
  ): Promise<DocumentHistoryResponse> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const params: unknown[] = [tenantId];
    const outerConditions: string[] = [];

    if (query.search) {
      params.push(`%${query.search}%`);
      outerConditions.push(`resolved_doc_title ILIKE $${params.length}`);
    }

    const whereClause =
      outerConditions.length > 0 ? `WHERE ${outerConditions.join(' AND ')}` : '';

    const cte = `
      WITH doc_events AS (
        SELECT
          al.id,
          al.created_at,
          doc.id AS resolved_doc_id,
          doc.title AS resolved_doc_title,
          doc.status::text AS resolved_doc_status
        FROM audit_logs al
        INNER JOIN documents doc
          ON al.entity_type = 'document'
          AND doc.id::text = al.entity_id
          AND doc.tenant_id = al.tenant_id
        WHERE al.tenant_id = $1

        UNION ALL

        SELECT
          al.id,
          al.created_at,
          sig_doc.id AS resolved_doc_id,
          sig_doc.title AS resolved_doc_title,
          sig_doc.status::text AS resolved_doc_status
        FROM audit_logs al
        INNER JOIN documents sig_doc
          ON al.entity_type = 'signer'
          AND sig_doc.id::text = (al.metadata->>'documentId')
          AND sig_doc.tenant_id = al.tenant_id
        WHERE al.tenant_id = $1
      )
    `;

    const dataParams = [...params, limit, offset];
    const groupQuery = `
      ${cte}
      SELECT
        resolved_doc_id::text AS "documentId",
        resolved_doc_title AS "documentTitle",
        resolved_doc_status AS "documentStatus",
        MAX(created_at) AS "lastActivityAt",
        COUNT(*)::int AS "eventCount"
      FROM doc_events
      ${whereClause}
      GROUP BY resolved_doc_id, resolved_doc_title, resolved_doc_status
      ORDER BY MAX(created_at) DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      ${cte}
      SELECT COUNT(DISTINCT resolved_doc_id) AS total
      FROM doc_events
      ${whereClause}
    `;

    const [rows, countResult] = await Promise.all([
      this.auditRepository.manager.query<RawDocumentHistoryRow[]>(groupQuery, dataParams),
      this.auditRepository.manager.query<[{ total: string }]>(countQuery, params),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    const data: DocumentHistoryItem[] = rows.map((row) => ({
      documentId: row.documentId,
      documentTitle: row.documentTitle ?? null,
      documentStatus: row.documentStatus ?? null,
      lastActivityAt:
        row.lastActivityAt instanceof Date
          ? row.lastActivityAt.toISOString()
          : String(row.lastActivityAt),
      eventCount: Number(row.eventCount),
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
    documentId: string
  ): Promise<DocumentEventsResponse> {
    const params = [tenantId, documentId];

    const sql = `
      SELECT
        al.id,
        al.created_at AS "occurredAt",
        al.event_type AS "eventType",
        al.entity_type AS "entityType",
        al.entity_id AS "entityId",
        al.metadata AS metadata,
        doc.title AS "documentTitle",
        COALESCE(usr.name, sgn.name) AS "actorName",
        COALESCE(usr.email, sgn.email, al.metadata->>'email') AS "actorEmail"
      FROM audit_logs al
      LEFT JOIN documents doc
        ON al.entity_type = 'document'
        AND doc.id::text = al.entity_id
        AND doc.tenant_id = al.tenant_id
      LEFT JOIN users usr
        ON al.actor_type = 'user'
        AND usr.id::text = al.actor_id
        AND usr.tenant_id = al.tenant_id
      LEFT JOIN signers sgn
        ON al.actor_type = 'signer'
        AND sgn.id::text = al.actor_id
        AND sgn.tenant_id = al.tenant_id
      WHERE al.tenant_id = $1
        AND (
          (al.entity_type = 'document' AND al.entity_id = $2)
          OR (al.entity_type = 'signer' AND al.metadata->>'documentId' = $2)
        )
      ORDER BY al.created_at ASC
    `;

    const rows = await this.auditRepository.manager.query<RawDocumentEventRow[]>(sql, params);

    const documentTitle = rows.find((r) => r.documentTitle != null)?.documentTitle ?? null;

    const events: DocumentEventItem[] = rows.map((row) => ({
      id: row.id,
      occurredAt:
        row.occurredAt instanceof Date ? row.occurredAt.toISOString() : String(row.occurredAt),
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      actorName: row.actorName ?? null,
      actorEmail: row.actorEmail ?? null,
      summary: buildSummary(row.eventType),
      metadata: row.metadata,
    }));

    return {
      documentId,
      documentTitle,
      events,
    };
  }
}
