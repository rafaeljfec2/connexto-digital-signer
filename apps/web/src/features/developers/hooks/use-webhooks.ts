"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  developersApi,
  type CreateWebhookPayload,
  type UpdateWebhookPayload,
} from '../api';

const WH_QUERY = ['developers', 'webhooks'] as const;

export function useWebhooks() {
  return useQuery({
    queryKey: WH_QUERY,
    queryFn: developersApi.listWebhooks,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWebhookPayload) => developersApi.createWebhook(payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WH_QUERY }); },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateWebhookPayload & { id: string }) =>
      developersApi.updateWebhook(id, payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WH_QUERY }); },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => developersApi.deleteWebhook(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: WH_QUERY }); },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => developersApi.testWebhook(id),
  });
}

export function useWebhookDeliveries(configId: string, page: number) {
  return useQuery({
    queryKey: ['developers', 'webhook-deliveries', configId, page],
    queryFn: () => developersApi.listDeliveries(configId, page),
    enabled: configId.length > 0,
  });
}
