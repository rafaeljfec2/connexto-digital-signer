"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCreateDraft } from '@/features/documents/hooks/use-documents';
import { Button, Skeleton } from '@/shared/ui';

export default function NewDocumentPage() {
  const tDocuments = useTranslations('documents');
  const router = useRouter();
  const createDraft = useCreateDraft();
  const triggered = useRef(false);
  const [hasError, setHasError] = useState(false);

  const startDraft = () => {
    setHasError(false);
    createDraft.mutateAsync({ title: tDocuments('upload.defaultTitle') }).then(
      (result) => {
        router.replace(`/documents/${result.envelopeId}`);
      },
      () => {
        setHasError(true);
      },
    );
  };

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    startDraft();
    // First mount only; retry is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hasError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-medium text-foreground">
          {tDocuments('upload.title')}
        </h1>
        <p className="text-sm text-error">{tDocuments('upload.createDraftError')}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={startDraft} isLoading={createDraft.isPending}>
            {tDocuments('upload.retryCreateDraft')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.replace('/documents')}>
            {tDocuments('upload.backToDocuments')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="glass-card rounded-2xl p-6">
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
