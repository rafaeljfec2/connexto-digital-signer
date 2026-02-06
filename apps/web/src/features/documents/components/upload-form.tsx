"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useUploadDocument } from '@/features/documents/hooks/use-documents';
import { Button, Input } from '@/shared/ui';
import { UploadDropzone } from './upload-dropzone';
import { toast } from 'sonner';

export function UploadForm() {
  const tDocuments = useTranslations('documents');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadDocument();
  const maxSizeMb = 10;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(tDocuments('upload.errors.titleRequired'));
      return false;
    }
    if (!file) {
      setError(tDocuments('upload.errors.fileRequired'));
      return false;
    }
    if (file.type !== 'application/pdf') {
      setError(tDocuments('upload.errors.onlyPdf'));
      return false;
    }
    if (file.size > maxSizeBytes) {
      setError(tDocuments('upload.errors.tooLarge', { max: maxSizeMb }));
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
      await uploadMutation.mutateAsync({ title: title.trim(), file });
      toast.success(tDocuments('upload.success'));
      router.push('/documents');
    } catch {
      toast.error(tDocuments('upload.errors.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">
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
        onFileChange={setFile}
        label={tDocuments('upload.dropzoneLabel')}
        helperText={tDocuments('upload.dropzoneHelper')}
        removeLabel={tDocuments('upload.removeFile')}
        error={error ?? undefined}
        maxSizeMb={maxSizeMb}
      />
      <Button type="submit" disabled={uploadMutation.isPending}>
        {uploadMutation.isPending
          ? tDocuments('upload.submitting')
          : tDocuments('upload.submit')}
      </Button>
    </form>
  );
}
