"use client";

import { useCallback, useState } from 'react';

export type DropzoneProps = {
  readonly onFiles: (files: File[]) => void;
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly helperText?: string;
  readonly className?: string;
};

export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  label,
  helperText,
  className = '',
}: Readonly<DropzoneProps>) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files === null || files.length === 0) return;
      onFiles(Array.from(files));
    },
    [onFiles]
  );

  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center text-sm transition ${
        isDragging
          ? 'border-primary bg-th-active'
          : 'border-th-border bg-th-input'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {label ? <span className="font-medium text-foreground">{label}</span> : null}
      {helperText ? <span className="mt-2 text-foreground-muted">{helperText}</span> : null}
    </label>
  );
}
