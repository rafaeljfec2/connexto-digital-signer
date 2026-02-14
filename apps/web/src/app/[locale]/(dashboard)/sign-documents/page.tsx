'use client';

import { useSignerDocuments } from '@/features/documents/hooks/use-signer-documents';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { PageTransition, FadeIn } from '@/shared/animations';
import { Card } from '@/shared/ui';
import { Search, FileText, ExternalLink, Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

export default function SignDocumentsPage() {
  const t = useTranslations('signDocuments');
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 400);
  const { data, isLoading } = useSignerDocuments(debouncedSearch);

  const formatDate = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(value),
      ),
    [locale],
  );

  const handleSign = useCallback(
    (accessToken: string) => {
      window.open(`/${locale}/sign/${accessToken}`, '_blank');
    },
    [locale],
  );

  const hasSearched = debouncedSearch.length >= 3;
  const hasResults = (data?.length ?? 0) > 0;

  return (
    <PageTransition className="space-y-6">
      <FadeIn>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t('title')}
          </h1>
          <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card variant="glass" className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-th-border bg-th-bg py-3 pr-4 pl-10 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          {!hasSearched && search.length > 0 ? (
            <p className="mt-2 text-xs text-foreground-subtle">
              {t('searchHint')}
            </p>
          ) : null}
        </Card>
      </FadeIn>

      {isLoading && hasSearched ? (
        <FadeIn delay={0.2}>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={`skeleton-${String(i)}`} variant="glass" className="animate-pulse p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-th-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-th-hover" />
                    <div className="h-3 w-32 rounded bg-th-hover" />
                  </div>
                  <div className="h-8 w-20 rounded-lg bg-th-hover" />
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>
      ) : null}

      {hasSearched && !isLoading && hasResults ? (
        <FadeIn delay={0.2}>
          <div className="hidden border-b border-th-border pb-2 sm:grid sm:grid-cols-12 sm:gap-4 sm:px-4">
            <span className="col-span-4 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t('columns.document')}
            </span>
            <span className="col-span-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t('columns.signer')}
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t('columns.date')}
            </span>
            <span className="col-span-2 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t('columns.expires')}
            </span>
            <span className="col-span-1 text-xs font-medium uppercase tracking-wider text-foreground-subtle">
              {t('columns.action')}
            </span>
          </div>

          <div className="space-y-2">
            {data?.map((item) => (
              <Card
                key={item.signerId}
                variant="glass"
                className="p-4 transition-colors hover:bg-th-hover"
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3 sm:col-span-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.envelopeTitle}
                    </span>
                  </div>

                  <div className="sm:col-span-3">
                    <p className="truncate text-sm text-foreground">
                      {item.signerName}
                    </p>
                    <p className="truncate text-xs text-foreground-subtle">
                      {item.signerEmail}
                    </p>
                  </div>

                  <div className="text-xs text-foreground-muted sm:col-span-2">
                    {formatDate(item.envelopeCreatedAt)}
                  </div>

                  <div className="text-xs text-foreground-muted sm:col-span-2">
                    {item.envelopeExpiresAt
                      ? formatDate(item.envelopeExpiresAt)
                      : '—'}
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleSign(item.accessToken)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-primary/90"
                    >
                      {t('sign')}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>
      ) : null}

      {hasSearched && !isLoading && !hasResults ? (
        <FadeIn delay={0.2}>
          <Card variant="glass" className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-hover">
              <Inbox className="h-7 w-7 text-foreground-subtle" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-foreground">
              {t('empty')}
            </h3>
            <p className="mt-1 text-xs text-foreground-subtle">
              {t('emptyDescription')}
            </p>
          </Card>
        </FadeIn>
      ) : null}
    </PageTransition>
  );
}
