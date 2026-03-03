'use client';

import { useQuery } from '@tanstack/react-query';
import { listHistoryByDocuments, type ListDocumentHistoryParams } from '../api';

export function useHistoryByDocuments(params: ListDocumentHistoryParams) {
  return useQuery({
    queryKey: ['history', 'documents', params],
    queryFn: () => listHistoryByDocuments(params),
    placeholderData: (previous) => previous,
  });
}
