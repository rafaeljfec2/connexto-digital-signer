import { apiClient } from '@/shared/api/client';
import type { SigningMode, SignerRole, SignatureFieldType } from '@/features/documents/api';

export type TemplateVariableType = 'text' | 'date' | 'number';

export type TemplateSummary = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly signingMode: SigningMode;
  readonly isActive: boolean;
  readonly usageCount: number;
  readonly documentCount: number;
  readonly signerCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TemplateDocument = {
  readonly id: string;
  readonly templateId: string;
  readonly title: string;
  readonly mimeType: string;
  readonly size: number;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TemplateSigner = {
  readonly id: string;
  readonly templateId: string;
  readonly label: string;
  readonly role: SignerRole;
  readonly order: number | null;
  readonly authMethod: string;
  readonly requestEmail: boolean;
  readonly requestCpf: boolean;
  readonly requestPhone: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type TemplateField = {
  readonly id: string;
  readonly templateDocumentId: string;
  readonly templateSignerId: string;
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly required: boolean;
  readonly createdAt: string;
};

export type TemplateVariable = {
  readonly id: string;
  readonly templateId: string;
  readonly key: string;
  readonly label: string;
  readonly type: TemplateVariableType;
  readonly required: boolean;
  readonly defaultValue: string | null;
  readonly createdAt: string;
};

export type TemplateDetail = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly signingMode: SigningMode;
  readonly signingLanguage: string;
  readonly reminderInterval: string;
  readonly closureMode: string;
  readonly isActive: boolean;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly documents: ReadonlyArray<TemplateDocument>;
  readonly signers: ReadonlyArray<TemplateSigner>;
  readonly fields: ReadonlyArray<TemplateField>;
  readonly variables: ReadonlyArray<TemplateVariable>;
};

export type TemplatesListResponse = {
  readonly data: ReadonlyArray<TemplateSummary>;
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
};

export type ListTemplatesParams = {
  readonly page?: number;
  readonly limit?: number;
  readonly category?: string;
  readonly search?: string;
  readonly isActive?: boolean;
};

export type CreateTemplateInput = {
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly signingMode?: SigningMode;
  readonly signingLanguage?: string;
  readonly reminderInterval?: string;
  readonly closureMode?: string;
};

export type UpdateTemplateInput = {
  readonly name?: string;
  readonly description?: string;
  readonly category?: string;
  readonly signingMode?: SigningMode;
  readonly signingLanguage?: string;
  readonly reminderInterval?: string;
  readonly closureMode?: string;
  readonly isActive?: boolean;
};

export type AddTemplateSignerInput = {
  readonly label: string;
  readonly role?: SignerRole;
  readonly order?: number;
  readonly authMethod?: string;
  readonly requestEmail?: boolean;
  readonly requestCpf?: boolean;
  readonly requestPhone?: boolean;
};

export type UpdateTemplateSignerInput = {
  readonly label?: string;
  readonly role?: SignerRole;
  readonly order?: number;
  readonly authMethod?: string;
  readonly requestEmail?: boolean;
  readonly requestCpf?: boolean;
  readonly requestPhone?: boolean;
};

export type TemplateFieldInput = {
  readonly templateSignerId: string;
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly required?: boolean;
};

export type TemplateVariableInput = {
  readonly key: string;
  readonly label: string;
  readonly type?: TemplateVariableType;
  readonly required?: boolean;
  readonly defaultValue?: string;
};

export type SignerAssignment = {
  readonly slotLabel: string;
  readonly name: string;
  readonly email: string;
  readonly cpf?: string;
  readonly phone?: string;
  readonly birthDate?: string;
};

export type CreateEnvelopeFromTemplateInput = {
  readonly folderId: string;
  readonly title?: string;
  readonly variables?: Record<string, string>;
  readonly signers: ReadonlyArray<SignerAssignment>;
  readonly autoSend?: boolean;
  readonly message?: string;
};

export type CreateTemplateFromEnvelopeInput = {
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
};

export type CreateEnvelopeFromTemplateResponse = {
  readonly envelopeId: string;
  readonly sent: boolean;
};

export const listTemplates = async (
  params?: ListTemplatesParams,
): Promise<TemplatesListResponse> => {
  const response = await apiClient.get<TemplatesListResponse>('/templates', { params });
  return response.data;
};

export const getTemplate = async (id: string): Promise<TemplateDetail> => {
  const response = await apiClient.get<TemplateDetail>(`/templates/${id}`);
  return response.data;
};

export const createTemplate = async (
  input: CreateTemplateInput,
): Promise<TemplateSummary> => {
  const response = await apiClient.post<TemplateSummary>('/templates', input);
  return response.data;
};

export const updateTemplate = async (
  id: string,
  input: UpdateTemplateInput,
): Promise<TemplateSummary> => {
  const response = await apiClient.patch<TemplateSummary>(`/templates/${id}`, input);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/templates/${id}`);
};

export const addTemplateDocument = async (
  templateId: string,
  file: File,
  title: string,
  position?: number,
): Promise<TemplateDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (position !== undefined) formData.append('position', String(position));
  const response = await apiClient.post<TemplateDocument>(
    `/templates/${templateId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const removeTemplateDocument = async (
  templateId: string,
  docId: string,
): Promise<void> => {
  await apiClient.delete(`/templates/${templateId}/documents/${docId}`);
};

export const addTemplateSigner = async (
  templateId: string,
  input: AddTemplateSignerInput,
): Promise<TemplateSigner> => {
  const response = await apiClient.post<TemplateSigner>(
    `/templates/${templateId}/signers`,
    input,
  );
  return response.data;
};

export const updateTemplateSigner = async (
  templateId: string,
  signerId: string,
  input: UpdateTemplateSignerInput,
): Promise<TemplateSigner> => {
  const response = await apiClient.patch<TemplateSigner>(
    `/templates/${templateId}/signers/${signerId}`,
    input,
  );
  return response.data;
};

export const removeTemplateSigner = async (
  templateId: string,
  signerId: string,
): Promise<void> => {
  await apiClient.delete(`/templates/${templateId}/signers/${signerId}`);
};

export const batchUpdateTemplateFields = async (
  templateId: string,
  docId: string,
  fields: ReadonlyArray<TemplateFieldInput>,
): Promise<ReadonlyArray<TemplateField>> => {
  const response = await apiClient.put<ReadonlyArray<TemplateField>>(
    `/templates/${templateId}/documents/${docId}/fields/batch`,
    { fields },
  );
  return response.data;
};

export const batchUpdateTemplateVariables = async (
  templateId: string,
  variables: ReadonlyArray<TemplateVariableInput>,
): Promise<ReadonlyArray<TemplateVariable>> => {
  const response = await apiClient.put<ReadonlyArray<TemplateVariable>>(
    `/templates/${templateId}/variables`,
    { variables },
  );
  return response.data;
};

export const createEnvelopeFromTemplate = async (
  templateId: string,
  input: CreateEnvelopeFromTemplateInput,
): Promise<CreateEnvelopeFromTemplateResponse> => {
  const response = await apiClient.post<CreateEnvelopeFromTemplateResponse>(
    `/templates/${templateId}/envelopes`,
    input,
  );
  return response.data;
};

export const createTemplateFromEnvelope = async (
  envelopeId: string,
  input: CreateTemplateFromEnvelopeInput,
): Promise<TemplateDetail> => {
  const response = await apiClient.post<TemplateDetail>(
    `/envelopes/${envelopeId}/template`,
    input,
  );
  return response.data;
};
