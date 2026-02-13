import { apiClient } from '@/shared/api/client';

export type DocumentStatus =
  | 'draft'
  | 'pending_signatures'
  | 'completed'
  | 'expired';

export type EnvelopeStatus =
  | 'draft'
  | 'pending_signatures'
  | 'completed'
  | 'expired';

export type ReminderInterval = 'none' | '1_day' | '2_days' | '3_days' | '7_days';
export type SigningLanguage = 'pt-br' | 'en';
export type ClosureMode = 'automatic' | 'manual';
export type SigningMode = 'parallel' | 'sequential';

export type Folder = {
  readonly id: string;
  readonly tenantId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type FolderTreeNode = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdAt: string;
  readonly children: FolderTreeNode[];
};

export type EnvelopeSummary = {
  readonly id: string;
  readonly tenantId: string;
  readonly folderId: string;
  readonly title: string;
  readonly status: EnvelopeStatus;
  readonly signingMode: SigningMode;
  readonly expiresAt: string | null;
  readonly reminderInterval: ReminderInterval;
  readonly signingLanguage: SigningLanguage;
  readonly closureMode: ClosureMode;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DocumentSummary = {
  readonly id: string;
  readonly envelopeId: string;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly position: number;
  readonly createdAt: string;
};

export type DocumentDetail = DocumentSummary & {
  readonly tenantId: string;
  readonly originalFileKey: string | null;
  readonly originalHash: string | null;
  readonly finalFileKey: string | null;
  readonly finalHash: string | null;
  readonly version: number;
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

export type EnvelopesListResponse = {
  readonly data: EnvelopeSummary[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type ListEnvelopesParams = {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: EnvelopeStatus;
  readonly folderId?: string;
};

export type CreateEnvelopeInput = {
  readonly title: string;
  readonly folderId: string;
  readonly signingMode?: SigningMode;
  readonly expiresAt?: string | null;
  readonly reminderInterval?: ReminderInterval;
  readonly signingLanguage?: SigningLanguage;
  readonly closureMode?: ClosureMode;
};

export type UpdateEnvelopeInput = Partial<CreateEnvelopeInput>;

export type CreateFolderInput = {
  readonly name: string;
  readonly parentId?: string;
};

export type UpdateFolderInput = {
  readonly name?: string;
  readonly parentId?: string | null;
};

export type SendDocumentInput = {
  readonly message?: string;
};

export type CreateDocumentInput = {
  readonly title: string;
  readonly envelopeId: string;
  readonly position?: number;
};

export type UpdateDocumentInput = {
  readonly title?: string;
  readonly position?: number;
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

export const getFolderTree = async (): Promise<FolderTreeNode[]> => {
  const response = await apiClient.get<FolderTreeNode[]>('/folders');
  return response.data;
};

export const createFolder = async (input: CreateFolderInput): Promise<Folder> => {
  const response = await apiClient.post<Folder>('/folders', input);
  return response.data;
};

export const updateFolder = async (id: string, input: UpdateFolderInput): Promise<Folder> => {
  const response = await apiClient.patch<Folder>(`/folders/${id}`, input);
  return response.data;
};

export const deleteFolder = async (id: string): Promise<void> => {
  await apiClient.delete(`/folders/${id}`);
};

export const getEnvelopesStats = async (): Promise<DocumentsStats> => {
  const response = await apiClient.get<DocumentsStats>('/envelopes/stats');
  return response.data;
};

export const listEnvelopes = async (
  params: ListEnvelopesParams
): Promise<EnvelopesListResponse> => {
  const response = await apiClient.get<EnvelopesListResponse>('/envelopes', {
    params,
  });
  return response.data;
};

export const getEnvelope = async (id: string): Promise<EnvelopeSummary> => {
  const response = await apiClient.get<EnvelopeSummary>(`/envelopes/${id}`);
  return response.data;
};

export const createEnvelope = async (input: CreateEnvelopeInput): Promise<EnvelopeSummary> => {
  const response = await apiClient.post<EnvelopeSummary>('/envelopes', input);
  return response.data;
};

export const updateEnvelope = async (
  id: string,
  input: UpdateEnvelopeInput,
): Promise<EnvelopeSummary> => {
  const response = await apiClient.patch<EnvelopeSummary>(`/envelopes/${id}`, input);
  return response.data;
};

export const deleteEnvelope = async (id: string): Promise<void> => {
  await apiClient.delete(`/envelopes/${id}`);
};

export const listDocumentsByEnvelope = async (
  envelopeId: string
): Promise<DocumentDetail[]> => {
  const response = await apiClient.get<DocumentDetail[]>(`/envelopes/${envelopeId}/documents`);
  return response.data;
};

export const createDocument = async (
  input: CreateDocumentInput,
  file?: File,
): Promise<DocumentSummary> => {
  if (file) {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('envelopeId', input.envelopeId);
    if (input.position !== undefined) formData.append('position', String(input.position));
    formData.append('file', file);
    const response = await apiClient.post<DocumentSummary>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
  const response = await apiClient.post<DocumentSummary>('/documents', input);
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

export const uploadDocumentFile = async (
  documentId: string,
  file: File
): Promise<DocumentDetail> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<DocumentDetail>(`/documents/${documentId}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateDocument = async (
  documentId: string,
  input: UpdateDocumentInput
): Promise<DocumentDetail> => {
  const response = await apiClient.patch<DocumentDetail>(`/documents/${documentId}`, input);
  return response.data;
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}`);
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

export const listSigners = async (envelopeId: string): Promise<Signer[]> => {
  const response = await apiClient.get<Signer[]>(`/envelopes/${envelopeId}/signers`);
  return response.data;
};

export const addSigner = async (
  envelopeId: string,
  input: CreateSignerInput
): Promise<Signer> => {
  const response = await apiClient.post<Signer>(`/envelopes/${envelopeId}/signers`, input);
  return response.data;
};

export type UpdateSignerInput = Partial<CreateSignerInput>;

export const updateSigner = async (
  envelopeId: string,
  signerId: string,
  input: UpdateSignerInput
): Promise<Signer> => {
  const response = await apiClient.patch<Signer>(`/envelopes/${envelopeId}/signers/${signerId}`, input);
  return response.data;
};

export const removeSigner = async (envelopeId: string, signerId: string): Promise<void> => {
  await apiClient.delete(`/envelopes/${envelopeId}/signers/${signerId}`);
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

export const sendEnvelope = async (
  envelopeId: string,
  input: SendDocumentInput
): Promise<{ notified: string[] }> => {
  const response = await apiClient.post<{ notified: string[] }>(
    `/envelopes/${envelopeId}/send`,
    input
  );
  return response.data;
};

export const previewEmail = async (
  envelopeId: string,
  input: SendDocumentInput
): Promise<{ subject: string; body: string }> => {
  const response = await apiClient.get<{ subject: string; body: string }>(
    `/envelopes/${envelopeId}/send/preview`,
    { params: input }
  );
  return response.data;
};

export const getEnvelopeAuditSummary = async (
  envelopeId: string,
): Promise<DocumentAuditSummary> => {
  const response = await apiClient.get<DocumentAuditSummary>(
    `/envelopes/${envelopeId}/summary`,
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

export type SignerStatusType = 'pending' | 'signed';

export type SignerWithEnvelope = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly cpf: string | null;
  readonly status: SignerStatusType;
  readonly authMethod: string;
  readonly envelopeId: string;
  readonly envelopeTitle: string;
  readonly notifiedAt: string | null;
  readonly signedAt: string | null;
  readonly createdAt: string;
};

export type SignersListResponse = {
  readonly data: ReadonlyArray<SignerWithEnvelope>;
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type ListSignersParams = {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: SignerStatusType;
};

export const listAllSigners = async (
  params: ListSignersParams,
): Promise<SignersListResponse> => {
  const response = await apiClient.get<SignersListResponse>('/signers', {
    params,
  });
  return response.data;
};

export type TenantSigner = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly cpf: string | null;
  readonly phone: string | null;
  readonly birthDate: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TenantSignersListResponse = {
  readonly data: ReadonlyArray<TenantSigner>;
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type ListTenantSignersParams = {
  readonly page?: number;
  readonly limit?: number;
};

export type CreateTenantSignerInput = {
  readonly name: string;
  readonly email: string;
  readonly cpf?: string;
  readonly phone?: string;
  readonly birthDate?: string;
};

export type UpdateTenantSignerInput = Partial<CreateTenantSignerInput>;

export const searchTenantSigners = async (
  query: string,
): Promise<TenantSigner[]> => {
  const response = await apiClient.get<TenantSigner[]>('/tenant-signers/search', {
    params: { q: query },
  });
  return response.data;
};

export const listTenantSigners = async (
  params: ListTenantSignersParams,
): Promise<TenantSignersListResponse> => {
  const response = await apiClient.get<TenantSignersListResponse>('/tenant-signers', {
    params,
  });
  return response.data;
};

export const createTenantSigner = async (
  input: CreateTenantSignerInput,
): Promise<TenantSigner> => {
  const response = await apiClient.post<TenantSigner>('/tenant-signers', input);
  return response.data;
};

export const updateTenantSigner = async (
  id: string,
  input: UpdateTenantSignerInput,
): Promise<TenantSigner> => {
  const response = await apiClient.patch<TenantSigner>(`/tenant-signers/${id}`, input);
  return response.data;
};

export const deleteTenantSigner = async (id: string): Promise<void> => {
  await apiClient.delete(`/tenant-signers/${id}`);
};
