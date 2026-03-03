export interface DocumentHistorySummary {
  readonly documentId: string;
  readonly documentTitle: string;
  readonly documentStatus: string | null;
  readonly lastActivity: string;
  readonly eventCount: number;
}

export interface DocumentEvent {
  readonly id: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly actorId: string | null;
  readonly actorType: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface DocumentHistoryResponse {
  readonly data: readonly DocumentHistorySummary[];
  readonly meta: PaginationMeta;
}

export interface DocumentEventsResponse {
  readonly data: readonly DocumentEvent[];
  readonly meta: PaginationMeta;
}
