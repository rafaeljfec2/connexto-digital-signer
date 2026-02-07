"use client";

import { Check, PenTool, Fingerprint, Type, Calendar, FileText } from 'lucide-react';
import type { SignerField } from '@/features/signing/api';

type FieldListPanelProps = Readonly<{
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  onFieldClick: (fieldId: string) => void;
  labels: Readonly<{
    fieldsProgress: string;
    required: string;
    optional: string;
    filled: string;
    tapToFill: string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

const FIELD_ICONS: Record<string, typeof PenTool> = {
  signature: PenTool,
  initials: Fingerprint,
  name: Type,
  date: Calendar,
  text: FileText,
};

export function FieldListPanel({
  fields,
  fieldValues,
  onFieldClick,
  labels,
  fieldTypeLabels,
}: FieldListPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-100/50">{labels.fieldsProgress}</p>
      <div className="space-y-2">
        {fields.map((field, idx) => {
          const value = fieldValues[field.id] ?? field.value ?? '';
          const isFilled = value.length > 0;
          const Icon = FIELD_ICONS[field.type] ?? PenTool;

          return (
            <button
              key={field.id}
              type="button"
              onClick={() => onFieldClick(field.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.98] ${
                isFilled
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-white/15 bg-white/5 text-neutral-100/80 hover:bg-white/10'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isFilled ? 'bg-success/20' : 'bg-white/10'
                }`}
              >
                {isFilled ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {fieldTypeLabels[field.type] ?? field.type}
                </p>
                <p className="text-[10px] text-neutral-100/40">
                  {isFilled
                    ? labels.filled
                    : field.required
                      ? labels.required
                      : labels.optional}
                  {' · '}
                  P.{field.page}
                </p>
              </div>
              {!isFilled ? (
                <span className="text-[10px] font-medium text-accent-400">
                  {labels.tapToFill}
                </span>
              ) : null}
              {isFilled && value.startsWith('data:image/') ? (
                <div className="flex h-8 w-12 items-center justify-center overflow-hidden rounded border border-success/20 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
