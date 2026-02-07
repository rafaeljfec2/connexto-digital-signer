"use client";

import { useMemo } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { FieldListPanel } from './field-list-panel';
import type { SignerField } from '@/features/signing/api';

type FillFieldsStepProps = Readonly<{
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  onFieldClick: (fieldId: string) => void;
  onNext: () => void;
  onBack: () => void;
  labels: Readonly<{
    instruction: string;
    progressFormat: (filled: number, total: number) => string;
    required: string;
    optional: string;
    filled: string;
    tapToFill: string;
    next: string;
    back: string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

export function FillFieldsStep({
  fields,
  fieldValues,
  onFieldClick,
  onNext,
  onBack,
  labels,
  fieldTypeLabels,
}: FillFieldsStepProps) {
  const requiredFields = useMemo(
    () => fields.filter((f) => f.required),
    [fields]
  );

  const filledCount = useMemo(
    () =>
      requiredFields.filter(
        (f) => (fieldValues[f.id] ?? f.value ?? '').length > 0
      ).length,
    [requiredFields, fieldValues]
  );

  const allRequiredFilled =
    filledCount === requiredFields.length && requiredFields.length > 0;

  const progressText = labels.progressFormat(filledCount, requiredFields.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-2 text-center text-[10px] text-neutral-100/60 md:mb-3 md:text-xs">
        {labels.instruction}
      </p>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-auto">
        <Card variant="glass" className="p-3 md:p-4">
          <FieldListPanel
            fields={fields}
            fieldValues={fieldValues as Record<string, string>}
            onFieldClick={onFieldClick}
            labels={{
              fieldsProgress: progressText,
              required: labels.required,
              optional: labels.optional,
              filled: labels.filled,
              tapToFill: labels.tapToFill,
            }}
            fieldTypeLabels={fieldTypeLabels}
          />
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-brand-900/95 px-4 py-2.5 backdrop-blur-sm md:static md:mt-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back}
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!allRequiredFilled}
          className="min-h-[40px]"
        >
          {labels.next}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
