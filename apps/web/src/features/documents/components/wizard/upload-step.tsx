"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useDocument,
  useUpdateDocument,
  useUploadDocumentFile,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Input } from '@/shared/ui';
import { UploadDropzone } from '../upload-dropzone';

export type UploadStepProps = {
  readonly documentId: string;
  readonly hasFile: boolean;
  readonly onNext: () => void;
};

export function UploadStep({ documentId, hasFile, onNext }: Readonly<UploadStepProps>) {
  const tDocuments = useTranslations('documents');
  const documentQuery = useDocument(documentId);
  const updateDocumentMutation = useUpdateDocument(documentId);
  const uploadMutation = useUploadDocumentFile(documentId);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxSizeMb = 10;
  const maxSizeBytes = useMemo(() => maxSizeMb * 1024 * 1024, [maxSizeMb]);
  const isTitleLocked = Boolean(documentQuery.data?.title?.trim());
  const displayTitle = isTitleLocked ? (documentQuery.data?.title ?? '') : title;
  const isSubmitting = uploadMutation.isPending || updateDocumentMutation.isPending;

  useEffect(() => {
    if (documentQuery.data?.title && !isTitleLocked) {
      setTitle(documentQuery.data.title);
    }
  }, [documentQuery.data?.title, isTitleLocked]);

  const validate = (): boolean => {
    if (!isTitleLocked && !title.trim()) {
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
    if (hasFile) {
      onNext();
      return;
    }
    if (!validate()) return;
    if (!file) return;
    try {
      if (!isTitleLocked && title.trim()) {
        await updateDocumentMutation.mutateAsync({ title: title.trim() });
      }
      await uploadMutation.mutateAsync({ file });
      toast.success(tDocuments('upload.success'));
      onNext();
    } catch {
      toast.error(tDocuments('upload.errors.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card variant="glass" className="space-y-5 p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-100">
            {tDocuments('upload.titleLabel')}
          </label>
          <Input
            value={displayTitle}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={tDocuments('upload.titlePlaceholder')}
            readOnly={isTitleLocked}
            disabled={isTitleLocked}
          />
        </div>
        {hasFile ? (
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-neutral-100/80">
            {tDocuments('upload.fileLoaded')}
          </div>
        ) : (
          <UploadDropzone
            file={file}
            onFileChange={setFile}
            label={tDocuments('upload.dropzoneLabel')}
            helperText={tDocuments('upload.dropzoneHelper')}
            removeLabel={tDocuments('upload.removeFile')}
            error={error ?? undefined}
            maxSizeMb={maxSizeMb}
          />
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tDocuments('upload.submitting') : tDocuments('upload.submit')}
        </Button>
      </Card>
    </form>
  );
}
