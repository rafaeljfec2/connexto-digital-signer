import { Badge, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';
import type { DocumentStatus, DocumentSummary } from '../api';
import { EmptyState } from './empty-state';

export type DocumentsTableProps = {
  readonly documents: DocumentSummary[];
  readonly isLoading?: boolean;
  readonly statusLabels: Record<DocumentStatus, string>;
  readonly headers: {
    readonly title: string;
    readonly status: string;
    readonly created: string;
  };
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly formatDate: (value: string) => string;
};

const statusVariant: Record<DocumentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> =
  {
    draft: 'default',
    pending_signatures: 'info',
    completed: 'success',
    expired: 'danger',
  };

export function DocumentsTable({
  documents,
  isLoading = false,
  statusLabels,
  headers,
  emptyTitle,
  emptyDescription,
  formatDate,
}: Readonly<DocumentsTableProps>) {
  if (!isLoading && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{headers.title}</TableHead>
          <TableHead>{headers.status}</TableHead>
          <TableHead>{headers.created}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))
          : documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium text-text">{doc.title}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[doc.status]}>
                    {statusLabels[doc.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted">
                  {formatDate(doc.createdAt)}
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
