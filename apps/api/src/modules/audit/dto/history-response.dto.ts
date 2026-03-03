export interface HistoryItem {
  readonly id: string;
  readonly occurredAt: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly documentTitle: string | null;
  readonly envelopeTitle: string | null;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
  readonly summary: string;
  readonly metadata: Record<string, unknown> | null;
}

export interface HistoryMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface HistoryResponse {
  readonly data: readonly HistoryItem[];
  readonly meta: HistoryMeta;
}

export interface DocumentHistoryItem {
  readonly documentId: string;
  readonly documentTitle: string | null;
  readonly documentStatus: string | null;
  readonly lastActivityAt: string;
  readonly eventCount: number;
}

export interface DocumentHistoryResponse {
  readonly data: readonly DocumentHistoryItem[];
  readonly meta: HistoryMeta;
}

export interface DocumentEventItem {
  readonly id: string;
  readonly occurredAt: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
  readonly summary: string;
  readonly metadata: Record<string, unknown> | null;
}

export interface DocumentEventsResponse {
  readonly documentId: string;
  readonly documentTitle: string | null;
  readonly events: readonly DocumentEventItem[];
}
