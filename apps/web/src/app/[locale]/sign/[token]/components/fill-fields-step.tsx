"use client";

import { useMemo } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { SignerPdfViewer } from '../signer-pdf-viewer';
import { FieldListPanel } from './field-list-panel';
import type { SignerField } from '@/features/signing/api';

type FillFieldsStepProps = Readonly<{
  fileUrl: string;
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
    clickToSign: string;
    clickToInitials: string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

export function FillFieldsStep({
  fileUrl,
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
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-center text-xs text-neutral-100/60 md:text-sm">
        {labels.instruction}
      </p>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <Card
          variant="glass"
          className="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          style={{ maxHeight: 'calc(100dvh - 260px)' }}
        >
          {fileUrl ? (
            <SignerPdfViewer
              fileUrl={fileUrl}
              fields={fields as SignerField[]}
              fieldValues={fieldValues as Record<string, string>}
              onFieldClick={onFieldClick}
              labels={{
                clickToSign: labels.clickToSign,
                clickToInitials: labels.clickToInitials,
              }}
            />
          ) : null}
        </Card>

        <div className="w-full space-y-4 lg:w-80 lg:shrink-0">
          <Card variant="glass" className="p-4">
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-white/10 bg-brand-900/95 px-4 py-3 backdrop-blur-sm md:static md:mt-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back}
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!allRequiredFilled}
          className="min-h-[44px]"
        >
          {labels.next}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
