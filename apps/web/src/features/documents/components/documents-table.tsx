'use client';

import {
  FileText,
  Calendar,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Skeleton } from '@/shared/ui';
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
    readonly delete?: string;
    readonly deleteConfirm?: string;
  };
  readonly onDocumentClick: (doc: DocumentSummary) => void;
  readonly onDeleteDocument?: (doc: DocumentSummary) => void;
  readonly deletingId?: string | null;
};

const STATUS_VARIANT: Record<
  DocumentStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  draft: 'default',
  pending_signatures: 'info',
  completed: 'success',
  expired: 'danger',
};

const STATUS_ICON_CLASS: Record<DocumentStatus, string> = {
  draft: 'bg-th-icon-bg text-th-icon-fg',
  pending_signatures: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  expired: 'bg-error/15 text-error',
};

function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-th-border/50 bg-th-hover/50 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="hidden h-5 w-20 sm:block" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

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
  onDeleteDocument,
  deletingId = null,
}: Readonly<DocumentsTableProps>) {
  if (!isLoading && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-2">
      <div className="hidden items-center gap-3 px-4 py-1 sm:flex">
        <div className="w-9 shrink-0" />
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {headers.title}
        </p>
        <p className="w-24 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {headers.status}
        </p>
        <p className="hidden w-32 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle md:block">
          {headers.created}
        </p>
        <div className="w-28" />
      </div>

      {isLoading
        ? Array.from({ length: 5 }, (_, i) => (
            <DocumentRowSkeleton key={`skeleton-${String(i)}`} />
          ))
        : documents.map((doc) => {
            const isDeleting = deletingId === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onDocumentClick(doc)}
                className={`group flex w-full items-center gap-3 rounded-xl border border-th-border/50 bg-th-hover/30 px-4 py-3 text-left transition-all hover:border-th-card-border hover:bg-th-hover ${isDeleting ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STATUS_ICON_CLASS[doc.status]}`}
                >
                  <FileText className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-normal text-foreground">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 sm:hidden">
                    <Badge
                      variant={STATUS_VARIANT[doc.status]}
                      className="mt-1 text-[10px]"
                    >
                      {statusLabels[doc.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-foreground-subtle md:hidden">
                    <Calendar className="h-3 w-3" />
                    {formatDate(doc.createdAt)}
                  </p>
                </div>

                <div className="hidden sm:block">
                  <Badge
                    variant={STATUS_VARIANT[doc.status]}
                    className="w-24 justify-center text-[10px]"
                  >
                    {statusLabels[doc.status]}
                  </Badge>
                </div>

                <p className="hidden w-32 text-center text-xs text-foreground-muted md:block">
                  {formatDate(doc.createdAt)}
                </p>

                <div className="flex w-28 items-center justify-end gap-1.5">
                  {doc.status === 'draft' && onDeleteDocument ? (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-error/15 hover:text-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDocument(doc);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  <Button
                    type="button"
                    variant={doc.status === 'draft' ? 'primary' : 'ghost'}
                    className="h-8 px-3 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDocumentClick(doc);
                    }}
                  >
                    {doc.status === 'draft'
                      ? actionLabels.continue
                      : actionLabels.view}
                  </Button>
                  <ChevronRight className="hidden h-4 w-4 text-foreground-subtle transition-colors group-hover:text-foreground-muted sm:block" />
                </div>
              </button>
            );
          })}
    </div>
  );
}
