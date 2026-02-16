'use client';

import { useSignerDocuments } from '@/features/documents/hooks/use-signer-documents';
import { SignerDocumentsEmpty } from '@/features/documents/components/signer-documents-empty';
import { SignerDocumentsList } from '@/features/documents/components/signer-documents-list';
import { SignerDocumentsSkeleton } from '@/features/documents/components/signer-documents-skeleton';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { formatMediumDate } from '@/shared/utils/date';
import { PageTransition, FadeIn } from '@/shared/animations';
import { Card } from '@/shared/ui';
import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 400;

export default function SignDocumentsPage() {
  const t = useTranslations('signDocuments');
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), DEBOUNCE_MS);
  const { data, isLoading } = useSignerDocuments(debouncedSearch);

  const formatDate = useCallback(
    (value: string) => formatMediumDate(value, locale),
    [locale],
  );

  const handleSign = useCallback(
    (accessToken: string) => {
      window.open(`/${locale}/sign/${accessToken}`, '_blank');
    },
    [locale],
  );

  const hasSearched = debouncedSearch.length >= MIN_SEARCH_LENGTH;
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
          <SignerDocumentsSkeleton />
        </FadeIn>
      ) : null}

      {hasSearched && !isLoading && hasResults ? (
        <FadeIn delay={0.2}>
          <SignerDocumentsList
            items={data ?? []}
            columns={{
              document: t('columns.document'),
              signer: t('columns.signer'),
              date: t('columns.date'),
              expires: t('columns.expires'),
              action: t('columns.action'),
            }}
            signLabel={t('sign')}
            formatDate={formatDate}
            onSign={handleSign}
          />
        </FadeIn>
      ) : null}

      {hasSearched && !isLoading && !hasResults ? (
        <FadeIn delay={0.2}>
          <SignerDocumentsEmpty
            title={t('empty')}
            description={t('emptyDescription')}
          />
        </FadeIn>
      ) : null}
    </PageTransition>
  );
}
