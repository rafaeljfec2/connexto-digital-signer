"use client";

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DocumentWizard } from '@/features/documents/components/wizard/document-wizard';
import { useDocumentFile } from '@/features/documents/hooks/use-document-wizard';

export default function DocumentWizardPage() {
  const tWizard = useTranslations('wizard');
  const params = useParams<{ id: string }>();
  const documentId = params?.id ?? '';
  const fileQuery = useDocumentFile(documentId);
  const hasFile = Boolean(fileQuery.data);
  if (!documentId) {
    return <div className="text-sm text-muted">{tWizard('notFound')}</div>;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">{tWizard('title')}</h1>
      <DocumentWizard documentId={documentId} hasFile={hasFile} />
    </div>
  );
}
