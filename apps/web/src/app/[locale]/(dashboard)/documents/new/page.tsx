"use client";

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCreateDraft } from '@/features/documents/hooks/use-documents';
import { Skeleton } from '@/shared/ui';

export default function NewDocumentPage() {
  const tDocuments = useTranslations('documents');
  const router = useRouter();
  const createDraft = useCreateDraft();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    createDraft.mutateAsync({ title: tDocuments('upload.defaultTitle') }).then(
      (doc) => {
        router.replace(`/documents/${doc.id}`);
      },
      () => {
        router.replace('/documents');
      }
    );
  }, [createDraft, router, tDocuments]);

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
