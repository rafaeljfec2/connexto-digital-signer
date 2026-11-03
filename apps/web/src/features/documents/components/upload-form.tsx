"use client";

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useUploadDocument } from '@/features/documents/hooks/use-documents';
import {
  validateDocumentUploadContent,
  validateDocumentUploadSync,
  type DocumentUploadValidationError,
} from '@/features/documents/utils/document-upload-validation';
import { Button, Input } from '@/shared/ui';
import { UploadDropzone } from './upload-dropzone';
import { toast } from 'sonner';

const PDF_MAX_SIZE_MB = 5;

function uploadErrorMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  error: DocumentUploadValidationError,
  name: string,
): string {
  switch (error) {
    case 'unsupportedExtension':
      return t('upload.errors.unsupportedExtension', { name });
    case 'invalidContent':
      return t('upload.errors.invalidContent', { name });
    case 'tooLarge':
      return t('upload.errors.tooLarge', { name, max: PDF_MAX_SIZE_MB });
    case 'unsupportedType':
    default:
      return t('upload.errors.unsupportedType', { name });
  }
}

export function UploadForm() {
  const tDocuments = useTranslations('documents');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadDocument();

  const handleFileChange = useCallback(
    async (next: File | null) => {
      if (next === null) {
        setFile(null);
        setError(null);
        return;
      }
      const syncError = validateDocumentUploadSync(next);
      if (syncError !== null) {
        setError(uploadErrorMessage(tDocuments, syncError, next.name));
        toast.error(uploadErrorMessage(tDocuments, syncError, next.name));
        return;
      }
      const contentError = await validateDocumentUploadContent(next);
      if (contentError !== null) {
        setError(uploadErrorMessage(tDocuments, contentError, next.name));
        toast.error(uploadErrorMessage(tDocuments, contentError, next.name));
        return;
      }
      setFile(next);
      setError(null);
    },
    [tDocuments],
  );

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(tDocuments('upload.errors.titleRequired'));
      return false;
    }
    if (!file) {
      setError(tDocuments('upload.errors.fileRequired'));
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    if (!file) return;
    try {
      const created = await uploadMutation.mutateAsync({ title: title.trim(), file });
      toast.success(tDocuments('upload.success'));
      router.push(`/documents/${created.id}`);
    } catch {
      toast.error(tDocuments('upload.errors.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-normal text-foreground-muted">
          {tDocuments('upload.titleLabel')}
        </label>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={tDocuments('upload.titlePlaceholder')}
        />
      </div>
      <UploadDropzone
        file={file}
        onFileChange={handleFileChange}
        label={tDocuments('upload.dropzoneLabel')}
        helperText={tDocuments('upload.dropzoneHelper')}
        removeLabel={tDocuments('upload.removeFile')}
        error={error ?? undefined}
      />
      <Button type="submit" disabled={uploadMutation.isPending}>
        {uploadMutation.isPending
          ? tDocuments('upload.submitting')
          : tDocuments('upload.submit')}
      </Button>
    </form>
  );
}
