import { apiClient } from '@/shared/api/client';

export type DocumentStatus =
  | 'draft'
  | 'pending_signatures'
  | 'completed'
  | 'expired';

export type DocumentSummary = {
  readonly id: string;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly createdAt: string;
};

export type DocumentsStats = {
  readonly pending: number;
  readonly completed: number;
  readonly expired: number;
  readonly draft: number;
  readonly total: number;
};

export type DocumentsListResponse = {
  readonly data: DocumentSummary[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type ListDocumentsParams = {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: DocumentStatus;
};

export type UploadDocumentInput = {
  readonly title: string;
  readonly file: File;
};

export const getDocumentsStats = async (): Promise<DocumentsStats> => {
  const response = await apiClient.get<DocumentsStats>('/documents/stats');
  return response.data;
};

export const listDocuments = async (
  params: ListDocumentsParams
): Promise<DocumentsListResponse> => {
  const response = await apiClient.get<DocumentsListResponse>('/documents', {
    params,
  });
  return response.data;
};

export const uploadDocument = async (
  input: UploadDocumentInput
): Promise<DocumentSummary> => {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('file', input.file);
  const response = await apiClient.post<DocumentSummary>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
