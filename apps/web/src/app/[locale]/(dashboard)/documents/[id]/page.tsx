"use client";

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DocumentWizard } from '@/features/documents/components/wizard/document-wizard';

export default function DocumentWizardPage() {
  const tWizard = useTranslations('wizard');
  const params = useParams<{ id: string }>();
  const documentId = params?.id ?? '';
  if (!documentId) {
    return <div className="text-sm text-muted">{tWizard('notFound')}</div>;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">{tWizard('title')}</h1>
      <DocumentWizard documentId={documentId} />
    </div>
  );
}
