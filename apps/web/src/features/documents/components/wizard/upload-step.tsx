'use client';

import type { DocumentDetail } from '@/features/documents/api';
import {
  useAddDocumentToEnvelope,
  useEnvelope,
  useEnvelopeDocuments,
  useRemoveDocument,
  useUpdateDocument,
  useUpdateEnvelope,
  useUploadDocumentFile,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Dropzone, Input } from '@/shared/ui';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export type UploadStepProps = {
  readonly envelopeId: string;
  readonly documentId: string;
  readonly hasFile: boolean;
  readonly onBack?: () => void;
  readonly onRestart?: () => void;
  readonly onCancel?: () => void;
  readonly onNext: () => void;
};

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type DocumentItemProps = {
  readonly doc: DocumentDetail;
  readonly isRemoving: boolean;
  readonly canRemove: boolean;
  readonly onRemove: () => void;
  readonly removeLabel: string;
};

function DocumentItem({ doc, isRemoving, canRemove, onRemove, removeLabel }: DocumentItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-th-border bg-th-hover px-4 py-3">
      <FileText className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal">{doc.title}</p>
        <p className="text-xs text-foreground-muted">PDF</p>
      </div>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0 text-foreground-subtle hover:text-error"
          disabled={isRemoving}
          onClick={onRemove}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="sr-only">{removeLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}

type PendingFileItemProps = {
  readonly file: File;
  readonly isUploading: boolean;
  readonly onRemove: () => void;
  readonly removeLabel: string;
  readonly uploadingLabel: string;
};

function PendingFileItem({
  file,
  isUploading,
  onRemove,
  removeLabel,
  uploadingLabel,
}: PendingFileItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-th-border bg-th-input px-4 py-3">
      <FileText className="h-5 w-5 shrink-0 text-foreground-subtle" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal">{file.name}</p>
        <p className="text-xs text-foreground-muted">
          {isUploading ? uploadingLabel : formatFileSize(file.size)}
        </p>
      </div>
      {isUploading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-subtle" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0 text-foreground-subtle hover:text-error"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{removeLabel}</span>
        </Button>
      )}
    </div>
  );
}

export function UploadStep({
  envelopeId,
  documentId,
  hasFile,
  onBack,
  onRestart,
  onCancel,
  onNext,
}: Readonly<UploadStepProps>) {
  const t = useTranslations('documents');
  const tWizard = useTranslations('wizard');
  const queryClient = useQueryClient();

  const envelopeQuery = useEnvelope(envelopeId);
  const envelopeDocumentsQuery = useEnvelopeDocuments(envelopeId);
  const updateEnvelopeMutation = useUpdateEnvelope(envelopeId);
  const updateDocumentMutation = useUpdateDocument(documentId);
  const uploadFileMutation = useUploadDocumentFile(documentId);
  const addDocumentMutation = useAddDocumentToEnvelope(envelopeId);
  const removeDocumentMutation = useRemoveDocument(envelopeId);

  const [title, setTitle] = useState('');
  const [titleInitialized, setTitleInitialized] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  const uploadedDocuments = useMemo(
    () => (envelopeDocumentsQuery.data ?? []).filter((d) => d.originalFileKey !== null),
    [envelopeDocumentsQuery.data]
  );

  const primaryDocHasFile = useMemo(
    () => uploadedDocuments.some((d) => d.id === documentId),
    [uploadedDocuments, documentId]
  );

  const totalDocuments = uploadedDocuments.length + pendingFiles.length;

  useEffect(() => {
    if (envelopeQuery.data?.title && !titleInitialized) {
      setTitle(envelopeQuery.data.title);
      setTitleInitialized(true);
    }
  }, [envelopeQuery.data?.title, titleInitialized]);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];
      const existingNames = new Set(uploadedDocuments.map((d) => d.title));
      const pendingNames = new Set(pendingFiles.map((f) => f.name.replace(/\.pdf$/i, '')));

      for (const file of files) {
        if (file.type !== 'application/pdf') {
          toast.error(t('upload.errors.onlyPdf'));
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          toast.error(t('upload.errors.tooLarge', { name: file.name, max: MAX_SIZE_MB }));
          continue;
        }
        const baseName = file.name.replace(/\.pdf$/i, '');
        if (existingNames.has(baseName) || pendingNames.has(baseName)) {
          toast.error(t('upload.errors.duplicateFile', { name: file.name }));
          continue;
        }
        pendingNames.add(baseName);
        validFiles.push(file);
      }
      return validFiles;
    },
    [uploadedDocuments, pendingFiles, t]
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        setPendingFiles((prev) => [...prev, ...validFiles]);
        setError(null);
      }
    },
    [validateFiles]
  );

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveDocument = useCallback(
    async (docId: string) => {
      if (docId === documentId) return;
      setRemovingDocId(docId);
      try {
        await removeDocumentMutation.mutateAsync(docId);
      } catch {
        toast.error(t('upload.errors.failed'));
      } finally {
        setRemovingDocId(null);
      }
    },
    [documentId, removeDocumentMutation, t]
  );

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(t('upload.errors.titleRequired'));
      return false;
    }
    if (uploadedDocuments.length === 0 && pendingFiles.length === 0) {
      setError(t('upload.errors.fileRequired'));
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await updateEnvelopeMutation.mutateAsync({ title: title.trim() });

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (i === 0 && !primaryDocHasFile) {
          const fileName = file.name.replace(/\.pdf$/i, '');
          await updateDocumentMutation.mutateAsync({ title: fileName });
          await uploadFileMutation.mutateAsync(file);
          await queryClient.invalidateQueries({ queryKey: ['documents', 'detail', documentId] });
        } else {
          await addDocumentMutation.mutateAsync(file);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['envelopes', envelopeId, 'documents'] });
      await queryClient.invalidateQueries({ queryKey: ['documents', 'file', documentId] });

      setPendingFiles([]);
      toast.success(t('upload.success'));
      onNext();
    } catch {
      toast.error(t('upload.errors.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card variant="glass" className="space-y-5 p-6">
        <div className="space-y-2">
          <label className="text-sm font-normal text-foreground-muted">
            {t('upload.titleLabel')}
          </label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('upload.titlePlaceholder')}
          />
        </div>

        <Dropzone
          accept="application/pdf"
          multiple
          onFiles={handleFilesSelected}
          label={totalDocuments > 0 ? t('upload.addMore') : t('upload.dropzoneLabel')}
          helperText={t('upload.dropzoneHelper')}
        />

        {uploadedDocuments.length > 0 || pendingFiles.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-normal uppercase tracking-wider text-foreground-subtle">
              {t('upload.documentCount', { count: totalDocuments })}
            </p>
            <div className="space-y-2">
              {uploadedDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  isRemoving={removingDocId === doc.id}
                  canRemove={uploadedDocuments.length + pendingFiles.length > 1}
                  onRemove={() => handleRemoveDocument(doc.id)}
                  removeLabel={t('upload.removeFile')}
                />
              ))}
              {pendingFiles.map((file, index) => (
                <PendingFileItem
                  key={file.name}
                  file={file}
                  isUploading={isSubmitting}
                  onRemove={() => removePendingFile(index)}
                  removeLabel={t('upload.removeFile')}
                  uploadingLabel={t('upload.uploading', { name: file.name })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-error">{error}</p> : null}

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
              <Button
                type="button"
                variant="ghost"
                className="text-error hover:text-error/80"
                onClick={onCancel}
              >
                <X className="mr-1 h-4 w-4" />
                {tWizard('cancel')}
              </Button>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('upload.submitting') : t('upload.submit')}
          </Button>
        </div>
      </Card>
    </form>
  );
}
