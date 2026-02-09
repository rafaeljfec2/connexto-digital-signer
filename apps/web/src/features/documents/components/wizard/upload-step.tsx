"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { FileCheck, RefreshCw, X } from 'lucide-react';
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
  readonly onBack?: () => void;
  readonly onRestart?: () => void;
  readonly onCancel?: () => void;
  readonly onNext: () => void;
};

export function UploadStep({ documentId, hasFile, onBack, onRestart, onCancel, onNext }: Readonly<UploadStepProps>) {
  const tDocuments = useTranslations('documents');
  const tWizard = useTranslations('wizard');
  const queryClient = useQueryClient();
  const documentQuery = useDocument(documentId);
  const updateDocumentMutation = useUpdateDocument(documentId);
  const uploadMutation = useUploadDocumentFile(documentId);
  const [title, setTitle] = useState('');
  const [titleInitialized, setTitleInitialized] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxSizeMb = 10;
  const maxSizeBytes = useMemo(() => maxSizeMb * 1024 * 1024, [maxSizeMb]);
  const isSubmitting = uploadMutation.isPending || updateDocumentMutation.isPending;

  useEffect(() => {
    if (documentQuery.data?.title && !titleInitialized) {
      setTitle(documentQuery.data.title);
      setTitleInitialized(true);
    }
  }, [documentQuery.data?.title, titleInitialized]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(tDocuments('upload.errors.titleRequired'));
      return false;
    }
    if (!hasFile && !file && !replacing) {
      setError(tDocuments('upload.errors.fileRequired'));
      return false;
    }
    if (replacing && !file) {
      setError(tDocuments('upload.errors.fileRequired'));
      return false;
    }
    if (file && file.type !== 'application/pdf') {
      setError(tDocuments('upload.errors.onlyPdf'));
      return false;
    }
    if (file && file.size > maxSizeBytes) {
      setError(tDocuments('upload.errors.tooLarge', { max: maxSizeMb }));
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      const titleChanged = title.trim() !== (documentQuery.data?.title ?? '');
      if (titleChanged) {
        await updateDocumentMutation.mutateAsync({ title: title.trim() });
      }

      if (file) {
        await uploadMutation.mutateAsync({ file });
        await queryClient.invalidateQueries({ queryKey: ['documents', 'file', documentId] });
        setReplacing(false);
      }

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
          <label className="text-sm font-normal text-foreground-muted">
            {tDocuments('upload.titleLabel')}
          </label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={tDocuments('upload.titlePlaceholder')}
          />
        </div>
        {hasFile && !replacing ? (
          <div className="flex items-center justify-between rounded-xl border border-th-border bg-th-hover p-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-success" />
              <span className="text-sm text-foreground-muted">
                {tDocuments('upload.fileLoaded')}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 text-sm"
              onClick={() => {
                setReplacing(true);
                setFile(null);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {tDocuments('upload.replaceFile')}
            </Button>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                {tWizard('back')}
              </Button>
            ) : null}
            {onRestart ? (
              <Button type="button" variant="ghost" onClick={onRestart}>
                {tWizard('restart')}
              </Button>
            ) : null}
            {onCancel ? (
              <Button type="button" variant="ghost" className="text-error hover:text-error/80" onClick={onCancel}>
                <X className="mr-1 h-4 w-4" />
                {tWizard('cancel')}
              </Button>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tDocuments('upload.submitting') : tDocuments('upload.submit')}
          </Button>
        </div>
      </Card>
    </form>
  );
}
