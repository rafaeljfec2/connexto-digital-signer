'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, History, Search } from 'lucide-react';
import { Badge, Card, Input, Pagination, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import { useHistory } from '@/features/history/hooks/use-history';

const DEBOUNCE_DELAY = 300;

export default function HistoricoPage() {
  const t = useTranslations('historico');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  const { data: historyData, isLoading, error } = useHistory({
    search: debouncedSearch || undefined,
    page,
  });

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const renderLoadingState = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );

  const renderErrorState = () => (
    <Card className="flex flex-col items-center gap-4 px-4 py-8">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{t('errorTitle')}</p>
        <p className="text-xs text-foreground-muted">{t('errorDescription')}</p>
      </div>
    </Card>
  );

  const renderEmptyState = () => (
    <Card className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <History className="h-10 w-10 text-foreground-subtle" />
      <p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p>
      <p className="max-w-sm text-xs text-foreground-muted">{t('emptyDescription')}</p>
    </Card>
  );

  const renderDataState = () => {
    if (!historyData?.data.length) {
      return renderEmptyState();
    }

    return (
      <div className="space-y-3">
        {historyData.data.map((item) => {
          const itemDate = new Date(item.occurredAt);
          const formattedDate = itemDate.toLocaleDateString();
          const formattedTime = itemDate.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <Card key={item.id} className="flex flex-col gap-3 border-l-4 border-l-blue-500 p-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Badge variant="info" className="w-fit text-xs">
                    {item.eventType}
                  </Badge>
                  <span className="text-xs text-foreground-subtle">
                    {formattedDate} {formattedTime}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.summary}</p>
                <div className="flex flex-col gap-1 text-xs text-foreground-muted sm:flex-row sm:gap-3">
                  {item.documentTitle && (
                    <div>
                      <span className="font-medium">{t('document')}:</span> {item.documentTitle}
                    </div>
                  )}
                  {item.envelopeTitle && (
                    <div>
                      <span className="font-medium">{t('envelope')}:</span> {item.envelopeTitle}
                    </div>
                  )}
                  {item.actorName && (
                    <div>
                      <span className="font-medium">{t('actor')}:</span> {item.actorName}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <PageTransition>
      <FadeIn>
        <div className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('title')}</h1>
            <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('filterPlaceholder')}
              className="pl-10"
              aria-label={t('filterLabel')}
              disabled={isLoading}
            />
          </div>

          {isLoading ? renderLoadingState() : error ? renderErrorState() : renderDataState()}

          {historyData && historyData.meta.totalPages > 1 && (
            <Pagination
              page={historyData.meta.page}
              totalPages={historyData.meta.totalPages}
              onPageChange={handlePageChange}
              pageLabel={t('date')}
            />
          )}
        </div>
      </FadeIn>
    </PageTransition>
  );
}
