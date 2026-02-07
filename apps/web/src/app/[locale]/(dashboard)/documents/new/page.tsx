"use client";

import { useTranslations } from 'next-intl';
import { UploadForm } from '@/features/documents/components/upload-form';

export default function NewDocumentPage() {
  const tDocuments = useTranslations('documents');
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">{tDocuments('upload.title')}</h1>
        <p className="text-sm text-neutral-100/70">{tDocuments('upload.subtitle')}</p>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <UploadForm />
      </div>
    </div>
  );
}
