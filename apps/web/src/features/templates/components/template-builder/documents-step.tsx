'use client';

import { useTranslations } from 'next-intl';
import { FileText, ImageIcon, Trash2, Upload } from 'lucide-react';
import { Dropzone } from '@/shared/ui/dropzone';
import { Button } from '@/shared/ui';
import type { TemplateDocument } from '../../api';

type PendingFile = {
  readonly file: File;
  readonly title: string;
};

type DocumentsStepProps = {
  readonly documents: ReadonlyArray<TemplateDocument>;
  readonly pendingFiles: PendingFile[];
  readonly onAddFiles: (files: File[]) => void;
  readonly onRemoveDocument: (docId: string) => void;
  readonly onRemovePending: (index: number) => void;
};

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';

function getFileIcon(mimeType: string) {
  return mimeType.startsWith('image/') ? ImageIcon : FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsStep({
  documents,
  pendingFiles,
  onAddFiles,
  onRemoveDocument,
  onRemovePending,
}: DocumentsStepProps) {
  const t = useTranslations('templates');

  return (
    <div className="space-y-4">
      <Dropzone
        onFiles={onAddFiles}
        accept={ACCEPTED_TYPES}
        multiple
        label={t('builder.steps.documents')}
        helperText="PDF (5MB), PNG/JPEG/WEBP (3MB)"
      />

      {documents.length > 0 || pendingFiles.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-th-border bg-th-card p-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-foreground-muted">{formatSize(doc.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-error"
                  onClick={() => onRemoveDocument(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {pendingFiles.map((pf, i) => {
            const Icon = getFileIcon(pf.file.type);
            return (
              <div
                key={`pending-${pf.file.name}-${pf.file.size}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-th-border bg-th-input p-3"
              >
                <Upload className="h-5 w-5 shrink-0 text-foreground-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{pf.title}</p>
                  <p className="text-xs text-foreground-muted">
                    <Icon className="mr-1 inline h-3 w-3" />
                    {formatSize(pf.file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-error"
                  onClick={() => onRemovePending(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
