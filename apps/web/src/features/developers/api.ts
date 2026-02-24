import { apiClient } from '@/shared/api/client';

export interface ApiKeyItem {
  readonly id: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly keyLastFour: string;
  readonly scopes: string[];
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly totalRequests: number;
  readonly createdAt: string;
}

export interface ApiKeyCreateResponse extends ApiKeyItem {
  readonly rawKey: string;
}

export interface CreateApiKeyPayload {
  readonly name: string;
  readonly scopes: string[];
  readonly expiresAt?: string;
}

export interface WebhookConfigItem {
  readonly id: string;
  readonly url: string;
  readonly secret: string;
  readonly events: string[];
  readonly isActive: boolean;
  readonly retryConfig: { maxAttempts?: number; initialDelayMs?: number } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWebhookPayload {
  readonly url: string;
  readonly secret: string;
  readonly events: string[];
  readonly retryConfig?: { maxAttempts?: number; initialDelayMs?: number };
}

export interface UpdateWebhookPayload {
  readonly url?: string;
  readonly events?: string[];
  readonly isActive?: boolean;
  readonly retryConfig?: { maxAttempts?: number; initialDelayMs?: number };
}

export interface WebhookDeliveryItem {
  readonly id: string;
  readonly event: string;
  readonly statusCode: number | null;
  readonly duration: number;
  readonly success: boolean;
  readonly error: string | null;
  readonly attemptNumber: number;
  readonly createdAt: string;
}

export interface ApiLogItem {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly statusCode: number;
  readonly duration: number;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
}

export interface ApiLogStats {
  readonly totalRequests: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly avgDuration: number;
  readonly topEndpoints: ReadonlyArray<{ path: string; method: string; count: number }>;
  readonly requestsByDay: ReadonlyArray<{ date: string; count: number }>;
}

export const developersApi = {
  listApiKeys: () =>
    apiClient.get<ApiKeyItem[]>('/developers/api-keys').then((r) => r.data),

  createApiKey: (payload: CreateApiKeyPayload) =>
    apiClient.post<ApiKeyCreateResponse>('/developers/api-keys', payload).then((r) => r.data),

  revokeApiKey: (id: string) =>
    apiClient.post(`/developers/api-keys/${id}/revoke`),

  listWebhooks: () =>
    apiClient.get<WebhookConfigItem[]>('/webhooks/configs').then((r) => r.data),

  createWebhook: (payload: CreateWebhookPayload) =>
    apiClient.post<WebhookConfigItem>('/webhooks/configs', payload).then((r) => r.data),

  updateWebhook: (id: string, payload: UpdateWebhookPayload) =>
    apiClient.patch<WebhookConfigItem>(`/webhooks/configs/${id}`, payload).then((r) => r.data),

  deleteWebhook: (id: string) =>
    apiClient.delete(`/webhooks/configs/${id}`),

  testWebhook: (id: string) =>
    apiClient.post<{ success: boolean; statusCode: number | null }>(`/webhooks/configs/${id}/test`).then((r) => r.data),

  listDeliveries: (configId: string, page = 1, limit = 20) =>
    apiClient.get<{ data: WebhookDeliveryItem[]; total: number }>(`/webhooks/configs/${configId}/deliveries`, {
      params: { page, limit },
    }).then((r) => r.data),

  retryDelivery: (deliveryId: string) =>
    apiClient.post(`/webhooks/deliveries/${deliveryId}/retry`),

  listLogs: (params: Record<string, string | number | undefined>) =>
    apiClient.get<{ data: ApiLogItem[]; total: number }>('/developers/logs', { params }).then((r) => r.data),

  getLogStats: () =>
    apiClient.get<ApiLogStats>('/developers/logs/stats').then((r) => r.data),
};
