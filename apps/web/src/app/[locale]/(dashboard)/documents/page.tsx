"use client";

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { useDocumentsList } from '@/features/documents/hooks/use-documents';
import { Pagination, Input } from '@/shared/ui';
import type { DocumentStatus, DocumentSummary } from '@/features/documents/api';
import { useRouter } from '@/i18n/navigation';

export default function DocumentsPage() {
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
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
      router.push(`/documents/${doc.id}`);
    },
    [router]
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-text">{tDocuments('title')}</h1>
        <p className="text-sm text-muted">{tDocuments('subtitle')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{tDocuments('filters.status')}</span>
          <select
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
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
          </select>
        </div>
        <Input
          placeholder={tDocuments('searchPlaceholder')}
          disabled
          className="sm:max-w-xs"
        />
      </div>
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
