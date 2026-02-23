"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DocumentWizard } from '@/features/documents/components/wizard/document-wizard';
import { useEnvelopeDocuments } from '@/features/documents/hooks/use-document-wizard';
import { useDeleteEnvelope } from '@/features/documents/hooks/use-documents';
import { ConfirmDialog, Skeleton } from '@/shared/ui';

export default function DocumentWizardPage() {
  const tWizard = useTranslations('wizard');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const envelopeId = params?.id ?? '';
  const documentsQuery = useEnvelopeDocuments(envelopeId);
  const deleteEnvelopeMutation = useDeleteEnvelope();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const primaryDocument = useMemo(
    () => documentsQuery.data?.[0] ?? null,
    [documentsQuery.data],
  );

  const hasFile = Boolean(primaryDocument?.mimeType);

  const handleCancel = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (envelopeId) {
        await deleteEnvelopeMutation.mutateAsync(envelopeId);
      }
      toast.success(tWizard('cancelSuccess'));
      router.push('/documents');
    } catch {
      toast.error(tWizard('cancelError'));
    } finally {
      setConfirmOpen(false);
    }
  };

  if (!envelopeId) {
    return <div className="text-sm text-muted">{tWizard('notFound')}</div>;
  }

  if (documentsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!primaryDocument) {
    return <div className="text-sm text-muted">{tWizard('notFound')}</div>;
  }

  const handleSendSuccess = (sentEnvelopeId: string) => {
    router.push(`/documents?track=${sentEnvelopeId}`);
  };

  return (
    <>
      <DocumentWizard
        envelopeId={envelopeId}
        documentId={primaryDocument.id}
        hasFile={hasFile}
        onCancel={handleCancel}
        onSendSuccess={handleSendSuccess}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={tWizard('cancelConfirmTitle')}
        description={tWizard('cancelConfirmDescription')}
        confirmLabel={tWizard('cancelConfirmButton')}
        cancelLabel={tWizard('cancelCancelButton')}
        isLoading={deleteEnvelopeMutation.isPending}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
