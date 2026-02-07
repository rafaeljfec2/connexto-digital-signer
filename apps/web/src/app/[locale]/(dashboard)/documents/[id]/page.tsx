"use client";

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DocumentWizard } from '@/features/documents/components/wizard/document-wizard';
import { useDocument } from '@/features/documents/hooks/use-document-wizard';
import { Skeleton } from '@/shared/ui';

export default function DocumentWizardPage() {
  const tWizard = useTranslations('wizard');
  const params = useParams<{ id: string }>();
  const documentId = params?.id ?? '';
  const documentQuery = useDocument(documentId);
  const hasFile = Boolean(documentQuery.data?.originalFileKey);

  if (!documentId) {
    return <div className="text-sm text-muted">{tWizard('notFound')}</div>;
  }

  if (documentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <DocumentWizard documentId={documentId} hasFile={hasFile} />
  );
}
