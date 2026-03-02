'use client';

import { useQuery } from '@tanstack/react-query';
import { historyApi, type HistoryQueryParams } from '../api';

export function useHistory(params: HistoryQueryParams) {
  return useQuery({
    queryKey: ['history', params],
    queryFn: () => historyApi.getHistory(params),
  });
}
