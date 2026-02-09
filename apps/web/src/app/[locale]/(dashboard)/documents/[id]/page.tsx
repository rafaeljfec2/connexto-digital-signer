"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DocumentWizard } from '@/features/documents/components/wizard/document-wizard';
import { useDocument } from '@/features/documents/hooks/use-document-wizard';
import { useDeleteDocument } from '@/features/documents/hooks/use-documents';
import { ConfirmDialog, Skeleton } from '@/shared/ui';

export default function DocumentWizardPage() {
  const tWizard = useTranslations('wizard');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params?.id ?? '';
  const documentQuery = useDocument(documentId);
  const deleteDocumentMutation = useDeleteDocument();
  const hasFile = Boolean(documentQuery.data?.originalFileKey);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCancel = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteDocumentMutation.mutateAsync(documentId);
      toast.success(tWizard('cancelSuccess'));
      router.push('/documents');
    } catch {
      toast.error(tWizard('cancelError'));
    } finally {
      setConfirmOpen(false);
    }
  };

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
    <>
      <DocumentWizard
        documentId={documentId}
        hasFile={hasFile}
        onCancel={handleCancel}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={tWizard('cancelConfirmTitle')}
        description={tWizard('cancelConfirmDescription')}
        confirmLabel={tWizard('cancelConfirmButton')}
        cancelLabel={tWizard('cancelCancelButton')}
        isLoading={deleteDocumentMutation.isPending}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
