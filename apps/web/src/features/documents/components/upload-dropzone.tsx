"use client";

import { Dropzone, Button } from '@/shared/ui';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';

const MIME_LABELS: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WEBP',
};

export type UploadDropzoneProps = {
  readonly file: File | null;
  readonly onFileChange: (file: File | null) => void;
  readonly label: string;
  readonly helperText: string;
  readonly removeLabel: string;
  readonly error?: string;
  readonly maxSizeMb: number;
};

export function UploadDropzone({
  file,
  onFileChange,
  label,
  helperText,
  removeLabel,
  error,
  maxSizeMb,
}: Readonly<UploadDropzoneProps>) {
  const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const fileTypeLabel = file ? (MIME_LABELS[file.type] ?? file.type.split('/')[1]?.toUpperCase() ?? '') : '';

  return (
    <div className="space-y-3">
      <Dropzone
        accept={ACCEPTED_TYPES}
        onFiles={(files) => onFileChange(files[0] ?? null)}
        label={label}
        helperText={helperText}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-th-border bg-th-hover px-4 py-3 text-sm text-foreground">
          <div className="space-y-1">
            <p className="font-normal">{file.name}</p>
            <p className="text-foreground-muted">
              {formatSize(file.size)} • {fileTypeLabel} • {maxSizeMb}MB max
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={() => onFileChange(null)}>
            {removeLabel}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
