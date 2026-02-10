import { apiClient } from '@/shared/api/client';

export interface CertificateStatus {
  readonly subject: string;
  readonly issuer: string;
  readonly expiresAt: string;
  readonly configuredAt: string;
  readonly isExpired: boolean;
}

export interface CertificateResponse {
  readonly configured: boolean;
  readonly certificate?: CertificateStatus;
}

export interface BrandingData {
  readonly companyName: string;
  readonly primaryColor: string;
  readonly logoUrl: string | null;
}

export interface DefaultsData {
  readonly defaultSigningLanguage: string;
  readonly defaultReminderInterval: string;
  readonly defaultClosureMode: string;
}

export interface NotificationsData {
  readonly emailSenderName: string;
}

export interface ApiKeyData {
  readonly configured: boolean;
  readonly lastFour: string | null;
}

export interface RegenerateApiKeyResponse {
  readonly apiKey: string;
}

export async function getCertificateStatus(): Promise<CertificateResponse> {
  const { data } = await apiClient.get<CertificateResponse>('/settings/certificate');
  return data;
}

export async function uploadCertificate(file: File, password: string): Promise<CertificateStatus> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  const { data } = await apiClient.post<CertificateStatus>('/settings/certificate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removeCertificate(): Promise<void> {
  await apiClient.delete('/settings/certificate');
}

export async function getBranding(): Promise<BrandingData> {
  const { data } = await apiClient.get<BrandingData>('/settings/branding');
  return data;
}

export async function updateBranding(
  input: { readonly name?: string; readonly primaryColor?: string },
): Promise<BrandingData> {
  const { data } = await apiClient.patch<BrandingData>('/settings/branding', input);
  return data;
}

export async function uploadLogo(file: File): Promise<{ readonly logoUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ readonly logoUrl: string }>('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getDefaults(): Promise<DefaultsData> {
  const { data } = await apiClient.get<DefaultsData>('/settings/defaults');
  return data;
}

export async function updateDefaults(
  input: Partial<DefaultsData>,
): Promise<DefaultsData> {
  const { data } = await apiClient.patch<DefaultsData>('/settings/defaults', input);
  return data;
}

export async function getNotifications(): Promise<NotificationsData> {
  const { data } = await apiClient.get<NotificationsData>('/settings/notifications');
  return data;
}

export async function updateNotifications(
  input: NotificationsData,
): Promise<NotificationsData> {
  const { data } = await apiClient.patch<NotificationsData>('/settings/notifications', input);
  return data;
}

export async function getApiKeyStatus(): Promise<ApiKeyData> {
  const { data } = await apiClient.get<ApiKeyData>('/settings/api-key');
  return data;
}

export async function regenerateApiKey(): Promise<RegenerateApiKeyResponse> {
  const { data } = await apiClient.post<RegenerateApiKeyResponse>('/settings/api-key/regenerate');
  return data;
}
