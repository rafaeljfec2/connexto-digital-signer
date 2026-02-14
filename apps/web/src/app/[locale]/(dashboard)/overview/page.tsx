'use client';

import { useAuth } from '@/features/auth/hooks/use-auth';
import type { EnvelopeSummary } from '@/features/documents/api';
import { ActivityFeed } from '@/features/documents/components/activity-feed';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { HelpSection } from '@/features/documents/components/help-section';
import { KpiCards } from '@/features/documents/components/kpi-cards';
import { OnboardingChecklist } from '@/features/documents/components/onboarding-checklist';
import { QuickActionsPanel } from '@/features/documents/components/quick-actions-panel';
import { TipsBanner } from '@/features/documents/components/tips-banner';
import {
  useDeleteEnvelope,
  useEnvelopesList,
  useDocumentsStats,
} from '@/features/documents/hooks/use-documents';
import { useRouter } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/ui';
import { FadeIn, PageTransition, StaggerChildren, StaggerItem } from '@/shared/animations';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

function getGreetingKey(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function formatRelativeDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale.startsWith('pt')) {
    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `ha ${String(diffMin)} min`;
    if (diffHours < 24) return `ha ${String(diffHours)}h`;
    if (diffDays === 1) return 'ontem';
    return `ha ${String(diffDays)} dias`;
  }

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${String(diffDays)}d ago`;
}

export default function DashboardPage() {
  const tDashboard = useTranslations('dashboard');
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnvelopeSummary | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const statsQuery = useDocumentsStats();
  const recentQuery = useEnvelopesList({ page: 1, limit: 5 });
  const deleteMutation = useDeleteEnvelope();

  const formatDate = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)),
    [locale]
  );

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
    (doc: EnvelopeSummary) => {
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

  const handleKpiClick = useCallback(
    (variant: string) => {
      const statusMap: Record<string, string> = {
        pending: 'pending_signatures',
        completed: 'completed',
        expired: 'expired',
        draft: 'draft',
      };
      const status = statusMap[variant];
      if (status) {
        router.push(`/documents?status=${status}`);
      }
    },
    [router]
  );

  const pendingCount = statsQuery.data?.pending ?? 0;
  const greeting = isMounted ? tDashboard(`greeting.${getGreetingKey()}`) : tDashboard('welcome');
  const userName = isMounted ? user?.name : undefined;

  const heroSubtitle =
    pendingCount > 0
      ? tDashboard('heroSubtitle', { pending: pendingCount })
      : tDashboard('heroSubtitleNone');

  return (
    <PageTransition className="space-y-6">
      <FadeIn>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {greeting}
            {userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-sm text-foreground-muted">{heroSubtitle}</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FadeIn delay={0.1}>
          <KpiCards
            items={[
              {
                label: tDashboard('kpi.pending'),
                value: statsQuery.data?.pending ?? 0,
                variant: 'pending',
              },
              {
                label: tDashboard('kpi.completed'),
                value: statsQuery.data?.completed ?? 0,
                variant: 'completed',
              },
              {
                label: tDashboard('kpi.expired'),
                value: statsQuery.data?.expired ?? 0,
                variant: 'expired',
              },
              { label: tDashboard('kpi.draft'), value: statsQuery.data?.draft ?? 0, variant: 'draft' },
            ]}
            isLoading={statsQuery.isLoading}
            onCardClick={handleKpiClick}
          />
          </FadeIn>
          <FadeIn delay={0.2}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground">{tDashboard('recentTitle')}</h2>
            <button
              type="button"
              onClick={() => router.push('/documents')}
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-accent-200"
            >
              {tDashboard('viewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <DocumentsTable
            documents={recentQuery.data?.data ?? []}
            isLoading={recentQuery.isLoading}
            statusLabels={statusLabels}
            headers={{
              title: tDocuments('table.title'),
              status: tDocuments('table.status'),
              docs: tDocuments('table.docs'),
              folder: tDocuments('table.folder'),
              created: tDocuments('table.created'),
              actions: tDocuments('table.actions'),
            }}
            emptyTitle={tDashboard('empty.title')}
            emptyDescription={tDashboard('empty.description')}
            formatDate={formatDate}
            actionLabels={{
              continue: tDocuments('actions.continue'),
              view: tDocuments('actions.view'),
              viewSummary: tDocuments('actions.viewSummary'),
              downloadOriginal: tDocuments('actions.downloadOriginal'),
              downloadSigned: tDocuments('actions.downloadSigned'),
              delete: tDocuments('actions.delete'),
            }}
            onDocumentClick={handleDocumentClick}
            onDeleteDocument={setDeleteTarget}
            deletingId={deleteMutation.isPending ? (deleteMutation.variables ?? null) : null}
          />

          </FadeIn>
          <FadeIn delay={0.3}>
          <TipsBanner
            labels={{
              dismiss: tDashboard('tips.dismiss'),
              learnMore: tDashboard('tips.learnMore'),
              tip1: tDashboard('tips.tip1'),
              tip2: tDashboard('tips.tip2'),
              tip3: tDashboard('tips.tip3'),
              tip4: tDashboard('tips.tip4'),
            }}
            onLearnMore={() => router.push('/documents/new')}
          />
          </FadeIn>
        </div>

        <StaggerChildren staggerDelay={0.1} className="space-y-4">
          <StaggerItem>
          <QuickActionsPanel
            labels={{
              title: tDashboard('quickActions.title'),
              sendDocument: tDashboard('quickActions.sendDocument'),
              viewAll: tDashboard('quickActions.viewAll'),
              signTitle: tDashboard('quickActions.signTitle'),
              signDescription: tDashboard('quickActions.signDescription'),
            }}
            onSendDocument={() => router.push('/documents/new')}
            onViewAll={() => router.push('/documents')}
            onSignDocuments={() => router.push('/sign-documents')}
          />
          </StaggerItem>

          <StaggerItem>
          <OnboardingChecklist
            labels={{
              title: tDashboard('onboarding.title'),
              progressFormat: (completed, total) =>
                tDashboard('onboarding.progress', { completed, total }),
              dismiss: tDashboard('onboarding.dismiss'),
              createAccount: tDashboard('onboarding.createAccount'),
              sendFirstDocument: tDashboard('onboarding.sendFirstDocument'),
              addSigners: tDashboard('onboarding.addSigners'),
              completeFirstSignature: tDashboard('onboarding.completeFirstSignature'),
            }}
            stats={{
              draft: statsQuery.data?.draft ?? 0,
              pending: statsQuery.data?.pending ?? 0,
              completed: statsQuery.data?.completed ?? 0,
            }}
          />
          </StaggerItem>

          <StaggerItem>
          <ActivityFeed
            labels={{
              title: tDashboard('activity.title'),
              empty: tDashboard('activity.empty'),
              sentForSignature: (title: string) =>
                tDashboard('activity.sentForSignature', { title }),
              documentCompleted: (title: string) =>
                tDashboard('activity.documentCompleted', { title }),
              documentExpired: (title: string) => tDashboard('activity.documentExpired', { title }),
            }}
            documents={recentQuery.data?.data ?? []}
            isLoading={recentQuery.isLoading}
            formatRelativeDate={(d) => formatRelativeDate(d, locale)}
          />
          </StaggerItem>

          <StaggerItem>
          <HelpSection
            labels={{
              title: tDashboard('help.title'),
              faq: tDashboard('help.faq'),
              support: tDashboard('help.support'),
              docs: tDashboard('help.docs'),
            }}
          />
          </StaggerItem>
        </StaggerChildren>
      </div>

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
    </PageTransition>
  );
}
