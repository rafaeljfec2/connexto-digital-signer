'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Calendar, ChevronRight, Clock, FileText, History, Search } from 'lucide-react';
import { Badge, Card, Input, Pagination, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useHistoryByDocuments } from '@/features/history/hooks/use-history-by-documents';
import { useDocumentHistory } from '@/features/history/hooks/use-document-history';
import type { DocumentHistorySummary } from '@/features/history/api';
import { useRouter } from '@/i18n/navigation';

const DEBOUNCE_DELAY = 300;

type DocumentStatusKey = 'draft' | 'pending_signatures' | 'completed' | 'expired';

const STATUS_VARIANTS: Record<DocumentStatusKey, 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'info',
  pending_signatures: 'warning',
  completed: 'success',
  expired: 'danger',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DocumentListSkeletonProps = Readonly<{ count?: number }>;

function DocumentListSkeleton({ count = 4 }: DocumentListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EventTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

type DocumentCardProps = Readonly<{
  doc: DocumentHistorySummary;
  eventCountLabel: string;
  eventCountPluralLabel: string;
  lastActivityLabel: string;
  statusLabels: Readonly<Record<string, string>>;
  onClick: (documentId: string) => void;
}>;

function DocumentCard({
  doc,
  eventCountLabel,
  eventCountPluralLabel,
  lastActivityLabel,
  statusLabels,
  onClick,
}: DocumentCardProps) {
  const statusKey = (doc.documentStatus ?? '') as DocumentStatusKey;
  const badgeVariant = STATUS_VARIANTS[statusKey] ?? 'info';
  const statusLabel = statusLabels[statusKey] ?? doc.documentStatus ?? '';
  const countLabel = doc.eventCount === 1 ? eventCountLabel : eventCountPluralLabel;

  return (
    <button
      type="button"
      onClick={() => onClick(doc.documentId)}
      className="w-full text-left"
    >
      <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-th-hover active:bg-th-active">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-th-icon-bg">
          <FileText className="h-5 w-5 text-th-icon-fg" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{doc.documentTitle}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {lastActivityLabel}: {formatDate(doc.lastActivity)}
            </span>
            <span>
              {doc.eventCount} {countLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {doc.documentStatus ? (
            <Badge variant={badgeVariant} className="hidden text-xs sm:flex">
              {statusLabel}
            </Badge>
          ) : null}
          <ChevronRight className="h-4 w-4 text-foreground-subtle" />
        </div>
      </Card>
    </button>
  );
}

type DocumentListViewProps = Readonly<{
  search: string;
  onSearchChange: (value: string) => void;
  onDocumentClick: (documentId: string, documentTitle: string) => void;
}>;

function DocumentListView({ search, onSearchChange, onDocumentClick }: DocumentListViewProps) {
  const t = useTranslations('historico');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, DEBOUNCE_DELAY);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, error } = useHistoryByDocuments({
    search: debouncedSearch || undefined,
    page,
  });

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    pending_signatures: t('status.pending_signatures'),
    completed: t('status.completed'),
    expired: t('status.expired'),
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('filterPlaceholder')}
          className="pl-10"
          aria-label={t('filterLabel')}
          disabled={isLoading}
        />
      </div>

      {isLoading ? (
        <DocumentListSkeleton />
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 px-4 py-8">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{t('errorTitle')}</p>
            <p className="text-xs text-foreground-muted">{t('errorDescription')}</p>
          </div>
        </Card>
      ) : !data?.data.length ? (
        <Card className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <History className="h-10 w-10 text-foreground-subtle" />
          <p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p>
          <p className="max-w-sm text-xs text-foreground-muted">{t('emptyDescription')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.data.map((doc) => (
            <DocumentCard
              key={doc.documentId}
              doc={doc}
              eventCountLabel={t('eventCount')}
              eventCountPluralLabel={t('eventCountPlural')}
              lastActivityLabel={t('lastActivity')}
              statusLabels={statusLabels}
              onClick={(id) => onDocumentClick(id, doc.documentTitle)}
            />
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
          pageLabel={t('pagination.page')}
        />
      ) : null}
    </div>
  );
}

type DocumentDetailViewProps = Readonly<{
  documentId: string;
  documentTitle: string;
  onBack: () => void;
}>;

function DocumentDetailView({ documentId, documentTitle, onBack }: DocumentDetailViewProps) {
  const t = useTranslations('historico');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useDocumentHistory(documentId, { page });

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 shrink-0 text-foreground-subtle" />
          <h2 className="truncate text-lg font-medium text-foreground">{documentTitle}</h2>
        </div>
        <p className="text-sm text-foreground-muted">{t('eventsTimeline')}</p>
      </div>

      {isLoading ? (
        <Card className="p-5">
          <EventTimelineSkeleton />
        </Card>
      ) : error ? (
        <Card className="flex flex-col items-center gap-4 px-4 py-8">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{t('errorEventsTitle')}</p>
            <p className="text-xs text-foreground-muted">{t('errorEventsDescription')}</p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('retry')}
          </button>
        </Card>
      ) : !data?.data.length ? (
        <Card className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <Calendar className="h-10 w-10 text-foreground-subtle" />
          <p className="text-sm font-medium text-foreground">{t('emptyEvents')}</p>
          <p className="max-w-sm text-xs text-foreground-muted">{t('emptyEventsDescription')}</p>
        </Card>
      ) : (
        <Card className="space-y-0 p-5">
          <div className="relative space-y-0">
            {data.data.map((event, idx) => {
              const isLast = idx === data.data.length - 1;
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    {isLast ? null : <div className="h-full w-px bg-th-border" />}
                  </div>
                  <div className="pb-5 min-w-0 flex-1">
                    <Badge variant="info" className="mb-1 text-[10px]">
                      {event.eventType}
                    </Badge>
                    <p className="text-xs text-foreground-subtle">{formatDateTime(event.occurredAt)}</p>
                    {event.actorId ? (
                      <p className="mt-0.5 text-xs text-foreground-muted">
                        {t('actor')}: {event.actorType ?? ''} ({event.actorId})
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={handlePageChange}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
          pageLabel={t('pagination.page')}
        />
      ) : null}
    </div>
  );
}

function HistoricoPageContent() {
  const t = useTranslations('historico');
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => searchParams.get('doc') ?? '');
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState('');

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      params.delete('doc');
      router.replace(`/historico?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleDocumentClick = useCallback(
    (documentId: string, documentTitle: string) => {
      setSelectedDocumentId(documentId);
      setSelectedDocumentTitle(documentTitle);
      const params = new URLSearchParams(searchParams.toString());
      params.set('doc', documentId);
      router.replace(`/historico?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleBack = useCallback(() => {
    setSelectedDocumentId('');
    setSelectedDocumentTitle('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('doc');
    router.replace(`/historico?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const isDetailView = selectedDocumentId !== '';

  return (
    <PageTransition>
      <FadeIn>
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('title')}</h1>
            <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
          </div>

          {isDetailView ? (
            <DocumentDetailView
              documentId={selectedDocumentId}
              documentTitle={selectedDocumentTitle}
              onBack={handleBack}
            />
          ) : (
            <DocumentListView
              search={search}
              onSearchChange={handleSearchChange}
              onDocumentClick={handleDocumentClick}
            />
          )}
        </div>
      </FadeIn>
    </PageTransition>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense
      fallback={
        <PageTransition>
          <div className="space-y-5">
            <div className="space-y-1">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-full max-w-sm" />
            <DocumentListSkeleton />
          </div>
        </PageTransition>
      }
    >
      <HistoricoPageContent />
    </Suspense>
  );
}
