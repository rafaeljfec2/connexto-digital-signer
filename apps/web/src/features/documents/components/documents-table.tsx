'use client';

import { Badge, Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';
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
    readonly actions: string;
  };
  readonly emptyTitle: string;
  readonly emptyDescription?: string;
  readonly formatDate: (value: string) => string;
  readonly actionLabels: {
    readonly continue: string;
    readonly view: string;
  };
  readonly onDocumentClick: (doc: DocumentSummary) => void;
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
  actionLabels,
  onDocumentClick,
}: Readonly<DocumentsTableProps>) {
  const skeletonRows = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'];
  if (!isLoading && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-neutral-100/70">{headers.title}</TableHead>
          <TableHead className="text-neutral-100/70">{headers.status}</TableHead>
          <TableHead className="hidden sm:table-cell text-neutral-100/70">
            {headers.created}
          </TableHead>
          <TableHead className="text-right text-neutral-100/70">{headers.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading
          ? skeletonRows.map((row) => (
              <TableRow key={row}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          : documents.map((doc) => (
              <TableRow
                key={doc.id}
                className="cursor-pointer transition-colors hover:bg-white/10"
                onClick={() => onDocumentClick(doc)}
              >
                <TableCell className="font-medium text-white">{doc.title}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[doc.status]}>
                    {statusLabels[doc.status]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-neutral-100/70">
                  {formatDate(doc.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant={doc.status === 'draft' ? 'primary' : 'ghost'}
                    className="text-xs h-7 px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDocumentClick(doc);
                    }}
                  >
                    {doc.status === 'draft'
                      ? actionLabels.continue
                      : actionLabels.view}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
