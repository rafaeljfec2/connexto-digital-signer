'use client';

import { useTranslations } from 'next-intl';
import { FileText, ImageIcon, Trash2, Upload, FileUp } from 'lucide-react';
import { Dropzone } from '@/shared/ui/dropzone';
import { Button } from '@/shared/ui';
import { StaggerChildren, StaggerItem } from '@/shared/animations';
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
  const totalCount = documents.length + pendingFiles.length;

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={onAddFiles}
        accept={ACCEPTED_TYPES}
        multiple
        label={t('builder.steps.documents')}
        helperText="PDF (5MB), PNG/JPEG/WEBP (3MB)"
      />

      {totalCount > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {t('detail.documents')}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {totalCount}
            </span>
          </div>

          <StaggerChildren className="space-y-2">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.mimeType);
              return (
                <StaggerItem key={doc.id}>
                  <div className="group flex items-center gap-3 rounded-xl border border-th-border bg-th-card p-3.5 transition-colors hover:border-primary/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-foreground-muted">{formatSize(doc.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-foreground-subtle opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                      onClick={() => onRemoveDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </StaggerItem>
              );
            })}
            {pendingFiles.map((pf, i) => (
              <StaggerItem key={`pending-${pf.file.name}-${pf.file.size}`}>
                <div className="group flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3.5 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileUp className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{pf.title}</p>
                    <p className="text-xs text-foreground-muted">{formatSize(pf.file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-foreground-subtle opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                    onClick={() => onRemovePending(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-hover text-foreground-subtle">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm text-foreground-muted">
            {t('builder.stepDescriptions.documents')}
          </p>
        </div>
      )}
    </div>
  );
}
