"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useUploadDocument } from '@/features/documents/hooks/use-documents';
import { Button, Input } from '@/shared/ui';
import { UploadDropzone } from './upload-dropzone';
import { toast } from 'sonner';

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function getMaxSizeMb(mime: string): number {
  return mime === 'application/pdf' ? 5 : 3;
}

export function UploadForm() {
  const tDocuments = useTranslations('documents');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadDocument();

  const maxSizeMb = file ? getMaxSizeMb(file.type) : 5;

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(tDocuments('upload.errors.titleRequired'));
      return false;
    }
    if (!file) {
      setError(tDocuments('upload.errors.fileRequired'));
      return false;
    }
    if (!ACCEPTED_MIMES.has(file.type)) {
      setError(tDocuments('upload.errors.unsupportedType', { name: file.name }));
      return false;
    }
    const limit = getMaxSizeMb(file.type);
    if (file.size > limit * 1024 * 1024) {
      setError(tDocuments('upload.errors.tooLarge', { name: file.name, max: limit }));
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
