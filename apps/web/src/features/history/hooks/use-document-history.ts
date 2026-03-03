'use client';

import { useQuery } from '@tanstack/react-query';
import { listDocumentEvents, type ListDocumentEventsParams } from '../api';

export function useDocumentHistory(documentId: string, params: ListDocumentEventsParams) {
  return useQuery({
    queryKey: ['history', 'documents', documentId, 'events', params],
    queryFn: () => listDocumentEvents(documentId, params),
    placeholderData: (previous) => previous,
    enabled: documentId !== '',
  });
}
