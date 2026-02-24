"use client";

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, LayoutTemplate } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { useEnvelopeAuditSummary, useEnvelopeDocuments } from '@/features/documents/hooks/use-document-wizard';
import { getDocumentFileUrl, getDocumentSignedFileUrl } from '@/features/documents/api';
import { lazyLoad } from '@/shared/utils/lazy-load';
import { SaveAsTemplateDialog } from '@/features/templates/components/save-as-template-dialog';

const DocumentAuditView = lazyLoad(
  () => import('@/features/documents/components/document-audit-view'),
  'DocumentAuditView',
);

export default function DocumentSummaryPage() {
  const params = useParams<{ id: string }>();
  const envelopeId = params.id;
  const t = useTranslations('audit');
  const tTemplates = useTranslations('templates');
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);

  const summaryQuery = useEnvelopeAuditSummary(envelopeId);
  const docsQuery = useEnvelopeDocuments(envelopeId);

  const documents = useMemo(
    () =>
      (docsQuery.data ?? []).map((d) => ({
        id: d.id,
        title: d.title,
      })),
    [docsQuery.data],
  );

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
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 text-sm"
          onClick={() => setSaveAsTemplateOpen(true)}
        >
          <LayoutTemplate className="h-4 w-4" />
          {tTemplates('actions.saveAsTemplate')}
        </Button>
      </div>
      <DocumentAuditView
        data={summaryQuery.data}
        documents={documents}
        onDownloadOriginal={(documentId) => getDocumentFileUrl(documentId ?? documents[0]?.id ?? envelopeId)}
        onDownloadSigned={(documentId) => getDocumentSignedFileUrl(documentId ?? documents[0]?.id ?? envelopeId)}
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
      <SaveAsTemplateDialog
        open={saveAsTemplateOpen}
        envelopeId={envelopeId}
        onClose={() => setSaveAsTemplateOpen(false)}
      />
    </div>
  );
}
