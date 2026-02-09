"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, Type as TypeIcon, FileText } from 'lucide-react';
import { Button, Input } from '@/shared/ui';

type FieldInputType = 'name' | 'date' | 'text';

type FieldInputModalLabels = Readonly<{
  cancel: string;
  confirm: string;
  nameTitle: string;
  namePlaceholder: string;
  dateTitle: string;
  datePlaceholder: string;
  textTitle: string;
  textPlaceholder: string;
}>;

type FieldInputModalProps = Readonly<{
  open: boolean;
  fieldType: FieldInputType;
  labels: FieldInputModalLabels;
  onConfirm: (value: string) => void;
  onClose: () => void;
}>;

const FIELD_CONFIG: Record<FieldInputType, { icon: typeof TypeIcon; titleKey: keyof FieldInputModalLabels; placeholderKey: keyof FieldInputModalLabels }> = {
  name: { icon: TypeIcon, titleKey: 'nameTitle', placeholderKey: 'namePlaceholder' },
  date: { icon: Calendar, titleKey: 'dateTitle', placeholderKey: 'datePlaceholder' },
  text: { icon: FileText, titleKey: 'textTitle', placeholderKey: 'textPlaceholder' },
};

function applyDateMask(raw: string): string {
  const digits = raw.replaceAll(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function FieldInputModal({
  open,
  fieldType,
  labels,
  onConfirm,
  onClose,
}: FieldInputModalProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, fieldType]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setValue(fieldType === 'date' ? applyDateMask(raw) : raw);
    },
    [fieldType],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && canConfirm) {
        onConfirm(value.trim());
      }
    },
    [value, onConfirm],
  );

  if (!open) return null;

  const config = FIELD_CONFIG[fieldType];
  const Icon = config.icon;
  const title = labels[config.titleKey];
  const placeholder = labels[config.placeholderKey];

  const canConfirm = fieldType === 'date'
    ? isValidDate(value)
    : value.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-th-card-border bg-th-dialog shadow-2xl">
        <div className="flex items-center gap-2 border-b border-th-border px-4 py-3 md:px-5">
          <Icon className="h-4 w-4 text-foreground-subtle" />
          <h2 className="text-sm font-medium text-foreground md:text-base">
            {title}
          </h2>
        </div>

        <div className="px-4 py-5 md:px-5">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            inputMode={fieldType === 'date' ? 'numeric' : 'text'}
            className="h-11 text-center text-base"
            autoFocus
          />
          {fieldType === 'date' && value.length > 0 && !isValidDate(value) ? (
            <p className="mt-2 text-center text-xs text-error">
              {labels.datePlaceholder}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-th-border px-4 py-3 md:px-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="min-h-[38px] px-4 text-sm"
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(value.trim())}
            disabled={!canConfirm}
            className="min-h-[38px] px-6 text-sm"
          >
            {labels.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
