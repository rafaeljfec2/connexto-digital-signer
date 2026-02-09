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

export type ReminderInterval = 'none' | '1_day' | '2_days' | '3_days' | '7_days';
export type SigningLanguage = 'pt-br' | 'en';
export type ClosureMode = 'automatic' | 'manual';

export type DocumentDetail = DocumentSummary & {
  readonly tenantId: string;
  readonly signingMode: 'parallel' | 'sequential';
  readonly originalFileKey: string | null;
  readonly expiresAt: string | null;
  readonly reminderInterval: ReminderInterval;
  readonly signingLanguage: SigningLanguage;
  readonly closureMode: ClosureMode;
  readonly updatedAt: string;
};

export type Signer = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly cpf: string | null;
  readonly birthDate: string | null;
  readonly requestEmail: boolean;
  readonly requestCpf: boolean;
  readonly requestPhone: boolean;
  readonly authMethod: string;
  readonly status: 'pending' | 'signed';
  readonly order: number | null;
  readonly notifiedAt: string | null;
  readonly createdAt: string;
};

export type CreateSignerInput = {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly cpf?: string;
  readonly birthDate?: string;
  readonly requestEmail?: boolean;
  readonly requestCpf?: boolean;
  readonly requestPhone?: boolean;
  readonly authMethod?: string;
  readonly order?: number;
};

export type SignatureFieldType = 'signature' | 'name' | 'date' | 'initials' | 'text';

export type SignatureField = {
  readonly id: string;
  readonly signerId: string;
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly required: boolean;
  readonly value: string | null;
};

export type SignatureFieldInput = {
  readonly id?: string;
  readonly signerId: string;
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly required?: boolean;
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

export type UploadDocumentFileInput = {
  readonly file: File;
};

export type CreateDraftInput = {
  readonly title: string;
};

export type SendDocumentInput = {
  readonly message?: string;
};

export type UpdateDocumentInput = {
  readonly title?: string;
  readonly signingMode?: 'parallel' | 'sequential';
  readonly expiresAt?: string | null;
  readonly reminderInterval?: ReminderInterval;
  readonly signingLanguage?: SigningLanguage;
  readonly closureMode?: ClosureMode;
};

export type AuditTimelineEvent = Readonly<{
  type: 'sent' | 'signed' | 'completed' | 'verified';
  actorName: string;
  actorEmail: string;
  timestamp: string;
}>;

export type AuditSignerInfo = Readonly<{
  id: string;
  name: string;
  email: string;
  status: string;
  authMethod: string;
  notifiedAt: string | null;
  signedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  verifiedAt: string | null;
  signatureData: string | null;
}>;

export type DocumentAuditSummary = Readonly<{
  document: Readonly<{
    id: string;
    title: string;
    status: string;
    signingMode: string;
    createdAt: string;
    expiresAt: string | null;
    completedAt: string | null;
    originalHash: string | null;
    finalHash: string | null;
  }>;
  signers: readonly AuditSignerInfo[];
  timeline: readonly AuditTimelineEvent[];
}>;

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

export const deleteDocument = async (documentId: string): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}`);
};

export const createDraftDocument = async (
  input: CreateDraftInput
): Promise<DocumentSummary> => {
  const response = await apiClient.post<DocumentSummary>('/documents', input);
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

export const uploadDocumentFile = async (
  documentId: string,
  input: UploadDocumentFileInput
): Promise<DocumentDetail> => {
  const formData = new FormData();
  formData.append('file', input.file);
  const response = await apiClient.post<DocumentDetail>(`/documents/${documentId}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getDocument = async (id: string): Promise<DocumentDetail> => {
  const response = await apiClient.get<DocumentDetail>(`/documents/${id}`);
  return response.data;
};

export const getDocumentFile = async (id: string): Promise<Blob> => {
  const response = await apiClient.get(`/documents/${id}/file`, {
    responseType: 'blob',
  });
  return response.data as Blob;
};

export const listSigners = async (documentId: string): Promise<Signer[]> => {
  const response = await apiClient.get<Signer[]>(`/documents/${documentId}/signers`);
  return response.data;
};

export const addSigner = async (
  documentId: string,
  input: CreateSignerInput
): Promise<Signer> => {
  const response = await apiClient.post<Signer>(`/documents/${documentId}/signers`, input);
  return response.data;
};

export type UpdateSignerInput = Partial<CreateSignerInput>;

export const updateSigner = async (
  documentId: string,
  signerId: string,
  input: UpdateSignerInput
): Promise<Signer> => {
  const response = await apiClient.patch<Signer>(`/documents/${documentId}/signers/${signerId}`, input);
  return response.data;
};

export const removeSigner = async (documentId: string, signerId: string): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}/signers/${signerId}`);
};

export const listFields = async (documentId: string): Promise<SignatureField[]> => {
  const response = await apiClient.get<SignatureField[]>(`/documents/${documentId}/fields`);
  return response.data;
};

export const batchUpdateFields = async (
  documentId: string,
  fields: SignatureFieldInput[]
): Promise<SignatureField[]> => {
  const response = await apiClient.put<SignatureField[]>(
    `/documents/${documentId}/fields/batch`,
    { fields }
  );
  return response.data;
};

export const sendDocument = async (
  documentId: string,
  input: SendDocumentInput
): Promise<{ notified: string[] }> => {
  const response = await apiClient.post<{ notified: string[] }>(
    `/documents/${documentId}/send`,
    input
  );
  return response.data;
};

export const previewEmail = async (
  documentId: string,
  input: SendDocumentInput
): Promise<{ subject: string; body: string }> => {
  const response = await apiClient.get<{ subject: string; body: string }>(
    `/documents/${documentId}/send/preview`,
    { params: input }
  );
  return response.data;
};

export const updateDocument = async (
  documentId: string,
  input: UpdateDocumentInput
): Promise<DocumentDetail> => {
  const response = await apiClient.patch<DocumentDetail>(`/documents/${documentId}`, input);
  return response.data;
};

export const getDocumentAuditSummary = async (
  documentId: string,
): Promise<DocumentAuditSummary> => {
  const response = await apiClient.get<DocumentAuditSummary>(
    `/documents/${documentId}/summary`,
  );
  return response.data;
};

export type SuggestedField = {
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly signerIndex: number;
};

export type SuggestFieldsResponse = {
  readonly fields: ReadonlyArray<SuggestedField>;
  readonly detectedSigners: number;
  readonly documentType: string;
  readonly confidence: number;
};

export const suggestFields = async (
  documentId: string,
  signerCount: number,
): Promise<SuggestFieldsResponse> => {
  const response = await apiClient.post<SuggestFieldsResponse>(
    `/documents/${documentId}/ai/suggest-fields`,
    null,
    { params: { signerCount } },
  );
  return response.data;
};

export const getDocumentSignedFile = async (documentId: string): Promise<Blob | null> => {
  try {
    const response = await apiClient.get(`/documents/${documentId}/signed-file`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  } catch {
    return null;
  }
};
