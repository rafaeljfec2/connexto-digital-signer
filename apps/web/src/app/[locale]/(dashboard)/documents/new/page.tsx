"use client";

import { useTranslations } from 'next-intl';
import { UploadForm } from '@/features/documents/components/upload-form';

export default function NewDocumentPage() {
  const tDocuments = useTranslations('documents');
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-text">{tDocuments('upload.title')}</h1>
        <p className="text-sm text-muted">{tDocuments('upload.subtitle')}</p>
      </div>
      <UploadForm />
    </div>
  );
}
