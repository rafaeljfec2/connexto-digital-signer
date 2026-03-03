import { apiClient } from '@/shared/api/client';

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

export interface HistoryQueryParams {
  readonly search?: string;
  readonly eventType?: string;
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly limit?: number;
}

export const historyApi = {
  getHistory: (params: HistoryQueryParams) =>
    apiClient.get<HistoryResponse>('/audit/history', { params }).then((r) => r.data),
};

export interface DocumentHistorySummary {
  readonly documentId: string;
  readonly documentTitle: string;
  readonly documentStatus: string | null;
  readonly lastActivity: string;
  readonly eventCount: number;
}

export interface DocumentHistoryResponse {
  readonly data: readonly DocumentHistorySummary[];
  readonly meta: HistoryMeta;
}

export interface ListDocumentHistoryParams {
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface DocumentEventItem {
  readonly id: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly actorId: string | null;
  readonly actorType: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export interface DocumentEventsResponse {
  readonly data: readonly DocumentEventItem[];
  readonly meta: HistoryMeta;
}

export interface ListDocumentEventsParams {
  readonly page?: number;
  readonly limit?: number;
}

export const listHistoryByDocuments = async (
  params: ListDocumentHistoryParams,
): Promise<DocumentHistoryResponse> => {
  const response = await apiClient.get<DocumentHistoryResponse>('/audit/history/documents', {
    params,
  });
  return response.data;
};

export const listDocumentEvents = async (
  documentId: string,
  params: ListDocumentEventsParams,
): Promise<DocumentEventsResponse> => {
  const response = await apiClient.get<DocumentEventsResponse>(
    `/audit/history/documents/${documentId}/events`,
    { params },
  );
  return response.data;
};
