"use client";

import { useQuery } from '@tanstack/react-query';
import { developersApi } from '../api';

export function useApiLogs(params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['developers', 'logs', params],
    queryFn: () => developersApi.listLogs(params),
  });
}

export function useApiLogStats() {
  return useQuery({
    queryKey: ['developers', 'logs', 'stats'],
    queryFn: developersApi.getLogStats,
  });
}
