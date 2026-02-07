'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useDocumentsList, useDocumentsStats } from '@/features/documents/hooks/use-documents';
import { KpiCards } from '@/features/documents/components/kpi-cards';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/shared/ui';
import type { DocumentSummary } from '@/features/documents/api';

export default function DashboardPage() {
  const tDashboard = useTranslations('dashboard');
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const statsQuery = useDocumentsStats();
  const recentQuery = useDocumentsList({ page: 1, limit: 5 });
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  const statusLabels = {
    draft: tDocuments('status.draft'),
    pending_signatures: tDocuments('status.pending'),
    completed: tDocuments('status.completed'),
    expired: tDocuments('status.expired'),
  };

  const handleDocumentClick = useCallback(
    (doc: DocumentSummary) => {
      router.push(`/documents/${doc.id}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text">{tDashboard('title')}</h1>
      <p className="text-sm text-muted">
        {isMounted && user
          ? `${tDashboard('welcome')}, ${user.name}`
          : tDashboard('welcome')}
      </p>
      <KpiCards
        items={[
          { label: tDashboard('kpi.pending'), value: statsQuery.data?.pending ?? 0 },
          { label: tDashboard('kpi.completed'), value: statsQuery.data?.completed ?? 0 },
          { label: tDashboard('kpi.expired'), value: statsQuery.data?.expired ?? 0 },
          { label: tDashboard('kpi.draft'), value: statsQuery.data?.draft ?? 0 },
        ]}
        isLoading={statsQuery.isLoading}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-text">{tDashboard('recentTitle')}</h2>
        <Button type="button" onClick={() => router.push('/documents/new')}>
          {tDashboard('newDocument')}
        </Button>
      </div>
      <DocumentsTable
        documents={recentQuery.data?.data ?? []}
        isLoading={recentQuery.isLoading}
        statusLabels={statusLabels}
        headers={{
          title: tDocuments('table.title'),
          status: tDocuments('table.status'),
          created: tDocuments('table.created'),
          actions: tDocuments('table.actions'),
        }}
        emptyTitle={tDashboard('empty.title')}
        emptyDescription={tDashboard('empty.description')}
        formatDate={formatDate}
        actionLabels={{
          continue: tDocuments('actions.continue'),
          view: tDocuments('actions.view'),
        }}
        onDocumentClick={handleDocumentClick}
      />
    </div>
  );
}
