"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developersApi, type CreateApiKeyPayload } from '../api';

const KEYS_QUERY = ['developers', 'api-keys'] as const;

export function useApiKeys() {
  return useQuery({
    queryKey: KEYS_QUERY,
    queryFn: developersApi.listApiKeys,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => developersApi.createApiKey(payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS_QUERY }); },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => developersApi.revokeApiKey(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS_QUERY }); },
  });
}
