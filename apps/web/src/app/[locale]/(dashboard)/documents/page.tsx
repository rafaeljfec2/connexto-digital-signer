"use client";

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { EmptyState } from '@/features/documents/components/empty-state';
import { useDeleteDocument, useDocumentsList } from '@/features/documents/hooks/use-documents';
import { Badge, Button, Card, ConfirmDialog, Pagination, Select, Skeleton } from '@/shared/ui';
import type { DocumentStatus, DocumentSummary } from '@/features/documents/api';
import { useRouter } from '@/i18n/navigation';
import { Calendar, FileText, LayoutGrid, List, Trash2 } from 'lucide-react';

const GRID_ICON_CLASS: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  pending_signatures: 'bg-info/15 text-info',
  expired: 'bg-error/15 text-error',
  draft: 'bg-white/10 text-neutral-100/50',
};

export default function DocumentsPage() {
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const limit = 10;

  const query = useDocumentsList({
    page,
    limit,
    status: status === 'all' ? undefined : status,
  });

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  const statusLabels = useMemo(
    () => ({
      draft: tDocuments('status.draft'),
      pending_signatures: tDocuments('status.pending'),
      completed: tDocuments('status.completed'),
      expired: tDocuments('status.expired'),
    }),
    [tDocuments]
  );

  const deleteMutation = useDeleteDocument();

  const handleDocumentClick = useCallback(
    (doc: DocumentSummary) => {
      if (doc.status === 'completed') {
        router.push(`/documents/${doc.id}/summary`);
      } else {
        router.push(`/documents/${doc.id}`);
      }
    },
    [router]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const skeletonCards = useMemo(() => ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'], []);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">{tDocuments('title')}</h1>
        <p className="text-sm text-neutral-100/70">{tDocuments('subtitle')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-100/70">
          <span>{tDocuments('filters.status')}</span>
          <Select
            className="min-w-[200px]"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DocumentStatus | 'all');
              setPage(1);
            }}
          >
            <option value="all">{tDocuments('filters.all')}</option>
            <option value="draft">{tDocuments('status.draft')}</option>
            <option value="pending_signatures">{tDocuments('status.pending')}</option>
            <option value="completed">{tDocuments('status.completed')}</option>
            <option value="expired">{tDocuments('status.expired')}</option>
          </Select>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1">
            <Button
              type="button"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {view === 'list' ? (
        <div className="glass-card rounded-2xl p-4">
          <DocumentsTable
            documents={query.data?.data ?? []}
            isLoading={query.isLoading}
            statusLabels={statusLabels}
            headers={{
              title: tDocuments('table.title'),
              status: tDocuments('table.status'),
              created: tDocuments('table.created'),
              actions: tDocuments('table.actions'),
            }}
            emptyTitle={tDocuments('empty.title')}
            emptyDescription={tDocuments('empty.description')}
            formatDate={formatDate}
            actionLabels={{
              continue: tDocuments('actions.continue'),
              view: tDocuments('actions.view'),
            }}
            onDocumentClick={handleDocumentClick}
            onDeleteDocument={setDeleteTarget}
            deletingId={deleteMutation.isPending ? (deleteMutation.variables ?? null) : null}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.isLoading
            ? skeletonCards.map((card) => (
                <Card key={card} variant="glass" className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))
            : (query.data?.data ?? []).map((doc) => (
                <Card
                  key={doc.id}
                  variant="glass"
                  className="group cursor-pointer space-y-3 p-5 transition-all hover:border-white/15 hover:bg-white/[0.06]"
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${GRID_ICON_CLASS[doc.status] ?? GRID_ICON_CLASS.draft}`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{doc.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-100/40">
                        <Calendar className="h-3 w-3" />
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={statusLabelsToVariant(doc.status)}>
                      {statusLabels[doc.status]}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {doc.status === 'draft' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-neutral-100/30 hover:text-error"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(doc);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant={doc.status === 'draft' ? 'primary' : 'ghost'}
                        className="h-8 px-3 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDocumentClick(doc);
                        }}
                      >
                        {doc.status === 'draft' ? tDocuments('actions.continue') : tDocuments('actions.view')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          {!query.isLoading && (query.data?.data ?? []).length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title={tDocuments('empty.title')}
                description={tDocuments('empty.description')}
              />
            </div>
          ) : null}
        </div>
      )}
      <Pagination
        page={query.data?.meta.page ?? page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        previousLabel={tDocuments('pagination.previous')}
        nextLabel={tDocuments('pagination.next')}
        pageLabel={tDocuments('pagination.page')}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={tDocuments('actions.deleteTitle')}
        description={tDocuments('actions.deleteConfirm')}
        confirmLabel={tDocuments('actions.delete')}
        cancelLabel={tDocuments('actions.cancel')}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const statusLabelsToVariant = (
  status: DocumentStatus
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'pending_signatures') return 'info';
  if (status === 'expired') return 'danger';
  return 'default';
};
