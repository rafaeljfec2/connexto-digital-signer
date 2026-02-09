"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/ui';
import { useSignerSummary } from '@/features/signing/hooks';
import { getSignerPdf, getSignerSignedPdf } from '@/features/signing/api';

const DocumentAuditView = dynamic(
  () => import('@/features/documents/components/document-audit-view').then((mod) => mod.DocumentAuditView),
  { ssr: false, loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
    </div>
  )}
);

export default function SignerSummaryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const t = useTranslations('audit');

  const summaryQuery = useSignerSummary(token);

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] dark:bg-gradient-main text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
          <p className="text-sm text-foreground-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] dark:bg-gradient-main px-4 text-foreground">
        <Card variant="glass" className="max-w-sm space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/20">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <p className="text-lg font-medium">{t('error')}</p>
          <p className="text-sm text-foreground-muted">{t('errorSubtitle')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--th-page-bg)] dark:bg-gradient-main px-4 py-6 text-foreground md:px-6 md:py-8">
      <DocumentAuditView
        data={summaryQuery.data}
        onDownloadOriginal={() => getSignerPdf(token)}
        onDownloadSigned={() => getSignerSignedPdf(token)}
        labels={{
          title: t('title'),
          documentDetails: t('documentDetails'),
          signingMode: t('signingMode'),
          signingModeParallel: t('signingModeParallel'),
          signingModeSequential: t('signingModeSequential'),
          createdAt: t('createdAt'),
          expiresAt: t('expiresAt'),
          completedAt: t('completedAt'),
          noExpiry: t('noExpiry'),
          statusLabels: {
            draft: t('status.draft'),
            pending_signatures: t('status.pending_signatures'),
            completed: t('status.completed'),
            expired: t('status.expired'),
          },
          hashes: t('hashes'),
          originalHash: t('originalHash'),
          signedHash: t('signedHash'),
          hashUnavailable: t('hashUnavailable'),
          copied: t('copied'),
          copy: t('copy'),
          timeline: t('timeline'),
          eventsFormat: {
            sent: (name: string) => t('events.sent', { name }),
            signed: (name: string) => t('events.signed', { name }),
            completed: () => t('events.completed'),
            verified: (name: string) => t('events.verified', { name }),
          },
          signers: t('signers'),
          signerCard: {
            signedAt: t('signerCard.signedAt'),
            notifiedAt: t('signerCard.notifiedAt'),
            ip: t('signerCard.ip'),
            userAgent: t('signerCard.userAgent'),
            authMethod: t('signerCard.authMethod'),
            authMethodEmail: t('signerCard.authMethodEmail'),
            authMethodNone: t('signerCard.authMethodNone'),
            verifiedAt: t('signerCard.verifiedAt'),
            pending: t('signerCard.pending'),
            signed: t('signerCard.signed'),
          },
          downloads: t('downloads'),
          downloadOriginal: t('downloadOriginal'),
          downloadOriginalDesc: t('downloadOriginalDesc'),
          downloadSigned: t('downloadSigned'),
          downloadSignedDesc: t('downloadSignedDesc'),
          downloadSignedUnavailable: t('downloadSignedUnavailable'),
          downloading: t('downloading'),
        }}
      />
    </div>
  );
}
