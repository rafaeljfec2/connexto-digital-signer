"use client";

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { EmptyState } from '@/features/documents/components/empty-state';
import { useDocumentsList } from '@/features/documents/hooks/use-documents';
import { Badge, Button, Card, Pagination, Select, Skeleton } from '@/shared/ui';
import type { DocumentStatus, DocumentSummary } from '@/features/documents/api';
import { useRouter } from '@/i18n/navigation';
import { LayoutGrid, List } from 'lucide-react';

export default function DocumentsPage() {
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'grid'>('list');
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
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.isLoading
            ? skeletonCards.map((card) => (
                <Card key={card} variant="glass" className="p-4">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-6 h-8 w-24" />
                </Card>
              ))
            : (query.data?.data ?? []).map((doc) => (
                <Card
                  key={doc.id}
                  variant="glass"
                  className="cursor-pointer space-y-4 p-4"
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{doc.title}</p>
                    <p className="text-xs text-neutral-100/70">{formatDate(doc.createdAt)}</p>
                  </div>
                  <Badge variant={doc.status === 'draft' ? 'default' : statusLabelsToVariant(doc.status)}>
                    {statusLabels[doc.status]}
                  </Badge>
                  <Button
                    type="button"
                    variant={doc.status === 'draft' ? 'primary' : 'ghost'}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDocumentClick(doc);
                    }}
                  >
                    {doc.status === 'draft' ? tDocuments('actions.continue') : tDocuments('actions.view')}
                  </Button>
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
