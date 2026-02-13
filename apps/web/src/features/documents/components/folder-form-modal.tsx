'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Input } from '@/shared/ui';

type FolderFormModalProps = Readonly<{
  open: boolean;
  mode: 'create' | 'rename';
  initialName?: string;
  isLoading?: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  labels: Readonly<{
    createTitle: string;
    renameTitle: string;
    placeholder: string;
    confirm: string;
    cancel: string;
  }>;
}>;

export function FolderFormModal({
  open,
  mode,
  initialName = '',
  isLoading = false,
  onConfirm,
  onCancel,
  labels,
}: FolderFormModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    onConfirm(trimmed);
  };

  const title = mode === 'create' ? labels.createTitle : labels.renameTitle;

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            {labels.cancel}
          </Button>
          <Button
            type="submit"
            form="folder-form"
            disabled={name.trim().length === 0 || isLoading}
            isLoading={isLoading}
          >
            {labels.confirm}
          </Button>
        </div>
      }
    >
      <form id="folder-form" onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.placeholder}
          maxLength={200}
        />
      </form>
    </Dialog>
  );
}
