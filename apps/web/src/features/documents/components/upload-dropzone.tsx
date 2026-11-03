"use client";

import { Dropzone, Button } from '@/shared/ui';
import { DOCUMENT_UPLOAD_ACCEPT, PDF_MAX_SIZE_BYTES } from '../utils/document-upload-validation';

const MAX_SIZE_MB = PDF_MAX_SIZE_BYTES / (1024 * 1024);

export type UploadDropzoneProps = {
  readonly file: File | null;
  readonly onFileChange: (file: File | null) => void | Promise<void>;
  readonly label: string;
  readonly helperText: string;
  readonly removeLabel: string;
  readonly error?: string;
  readonly maxSizeMb?: number;
};

export function UploadDropzone({
  file,
  onFileChange,
  label,
  helperText,
  removeLabel,
  error,
  maxSizeMb = MAX_SIZE_MB,
}: Readonly<UploadDropzoneProps>) {
  const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <div className="space-y-3">
      <Dropzone
        accept={DOCUMENT_UPLOAD_ACCEPT}
        onFiles={(files) => {
          void onFileChange(files[0] ?? null);
        }}
        label={label}
        helperText={helperText}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-th-border bg-th-hover px-4 py-3 text-sm text-foreground">
          <div className="space-y-1">
            <p className="font-normal">{file.name}</p>
            <p className="text-foreground-muted">
              {formatSize(file.size)} • PDF • {maxSizeMb}MB max
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
