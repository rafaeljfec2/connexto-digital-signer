"use client";

import { useMemo } from 'react';
import { ArrowRight, ArrowLeft, PenTool } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { FieldListPanel } from './field-list-panel';
import type { SignerField } from '@/features/signing/api';

type FillFieldsStepProps = Readonly<{
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  standaloneSignature: string | null;
  requireStandaloneSignature: boolean;
  onFieldClick: (fieldId: string) => void;
  onRequestSignature: () => void;
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
    drawSignature: string;
    changeSignature: string;
    signatureRequired: string;
    yourSignature: string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

export function FillFieldsStep({
  fields,
  fieldValues,
  standaloneSignature,
  requireStandaloneSignature,
  onFieldClick,
  onRequestSignature,
  onNext,
  onBack,
  labels,
  fieldTypeLabels,
}: FillFieldsStepProps) {
  const hasFields = fields.length > 0;

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

  const allFieldsFilled = hasFields
    ? filledCount === requiredFields.length && requiredFields.length > 0
    : true;

  const signatureReady = requireStandaloneSignature
    ? standaloneSignature !== null
    : true;

  const canProceed = allFieldsFilled && signatureReady;

  const progressText = labels.progressFormat(filledCount, requiredFields.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <p className="text-center text-xs text-foreground-muted md:text-sm">
          {labels.instruction}
        </p>

        {hasFields ? (
          <Card variant="glass" className="w-full max-w-md p-4 md:p-5">
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
        ) : null}

        {requireStandaloneSignature ? (
          <Card variant="glass" className="w-full max-w-md space-y-4 p-4 md:p-5">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-foreground-subtle" />
              <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                {labels.yourSignature}
              </p>
            </div>

            {standaloneSignature ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-success/20 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={standaloneSignature}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRequestSignature}
                  className="text-xs text-accent-400"
                >
                  <PenTool className="mr-1.5 h-3.5 w-3.5" />
                  {labels.changeSignature}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onRequestSignature}
                  className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-th-border bg-th-hover transition-all hover:border-accent-400/40 hover:bg-th-active"
                >
                  <div className="flex flex-col items-center gap-1.5 text-foreground-subtle">
                    <PenTool className="h-6 w-6" />
                    <span className="text-xs font-medium">{labels.drawSignature}</span>
                  </div>
                </button>
                <p className="text-[10px] text-warning/70">
                  {labels.signatureRequired}
                </p>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-th-border bg-th-card/95 px-4 py-3 backdrop-blur-sm">
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
          disabled={!canProceed}
          className="min-h-[40px]"
        >
          {labels.next}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
