"use client";

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/ui';
import { useDocumentAuditSummary } from '@/features/documents/hooks/use-document-wizard';
import { getDocumentFile, getDocumentSignedFile } from '@/features/documents/api';
import { DocumentAuditView } from '@/features/documents/components/document-audit-view';

export default function DocumentSummaryPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const t = useTranslations('audit');

  const summaryQuery = useDocumentAuditSummary(documentId);

  if (summaryQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
          <p className="text-sm text-foreground-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
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
    <div className="px-4 py-6 md:px-6 md:py-8">
      <DocumentAuditView
        data={summaryQuery.data}
        onDownloadOriginal={() => getDocumentFile(documentId)}
        onDownloadSigned={() => getDocumentSignedFile(documentId)}
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
