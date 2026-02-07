"use client";

import { Dropzone, Button } from '@/shared/ui';

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

  return (
    <div className="space-y-3">
      <Dropzone
        accept="application/pdf"
        onFiles={(files) => onFileChange(files[0] ?? null)}
        label={label}
        helperText={helperText}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
          <div className="space-y-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-neutral-100/70">
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
