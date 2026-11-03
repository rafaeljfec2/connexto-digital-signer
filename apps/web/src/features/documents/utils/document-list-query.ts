import type { DocumentStatus } from '@/features/documents/api';

const DOCUMENT_LIST_STATUSES: ReadonlySet<DocumentStatus> = new Set([
  'draft',
  'pending_signatures',
  'completed',
  'expired',
  'cancelled',
]);

export function parseDocumentListStatusParam(
  value: string | null,
): DocumentStatus | 'all' | null {
  if (value === null || value === '') {
    return null;
  }
  if (value === 'all') {
    return 'all';
  }
  if (DOCUMENT_LIST_STATUSES.has(value as DocumentStatus)) {
    return value as DocumentStatus;
  }
  return null;
}
