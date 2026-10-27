'use client';

import { useMemo } from 'react';
import { ArrowRight, ArrowLeft, Check, FileText, PenTool } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { FieldListPanel } from './field-list-panel';
import type { SignerField } from '@/features/signing/api';

type DocumentItem = {
  readonly id: string;
  readonly title: string;
};

type FillFieldsStepProps = Readonly<{
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  standaloneSignature: string | null;
  requireStandaloneSignature: boolean;
  documents: ReadonlyArray<DocumentItem>;
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
    documentGroup: (title: string) => string;
    signaturePages: (pages: string) => string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

function isFieldFilled(
  field: SignerField,
  fieldValues: Readonly<Record<string, string>>,
): boolean {
  return (fieldValues[field.id] ?? field.value ?? '').length > 0;
}

export function FillFieldsStep({
  fields,
  fieldValues,
  standaloneSignature,
  requireStandaloneSignature,
  documents,
  onFieldClick,
  onRequestSignature,
  onNext,
  onBack,
  labels,
  fieldTypeLabels,
}: FillFieldsStepProps) {
  const hasMultipleDocuments = documents.length > 1;

  const signatureFields = useMemo(
    () => fields.filter((field) => field.type === 'signature'),
    [fields],
  );

  const nonSignatureFields = useMemo(
    () => fields.filter((field) => field.type !== 'signature'),
    [fields],
  );

  const hasNonSignatureFields = nonSignatureFields.length > 0;
  const hasSignatureGroup = signatureFields.length > 0;

  const signatureRequired = signatureFields.some((field) => field.required);
  const signatureFilled = signatureFields.some((field) =>
    isFieldFilled(field, fieldValues),
  );
  const signaturePreview =
    signatureFields
      .map((field) => fieldValues[field.id] ?? field.value ?? '')
      .find((value) => value.startsWith('data:image/')) ?? null;

  const signaturePagesLabel = useMemo(() => {
    const pages = [...new Set(signatureFields.map((field) => field.page))].sort(
      (a, b) => a - b,
    );
    return labels.signaturePages(pages.join(', '));
  }, [signatureFields, labels]);

  const requiredNonSignatureFields = useMemo(
    () => nonSignatureFields.filter((field) => field.required),
    [nonSignatureFields],
  );

  const nonSignatureFilledCount = useMemo(
    () =>
      requiredNonSignatureFields.filter((field) =>
        isFieldFilled(field, fieldValues),
      ).length,
    [requiredNonSignatureFields, fieldValues],
  );

  const signatureReady = requireStandaloneSignature
    ? standaloneSignature !== null
    : !signatureRequired || signatureFilled;

  const requiredTotal =
    requiredNonSignatureFields.length +
    (signatureRequired ? 1 : 0) +
    (requireStandaloneSignature ? 1 : 0);

  const filledTotal =
    nonSignatureFilledCount +
    (signatureRequired && signatureFilled ? 1 : 0) +
    (requireStandaloneSignature && standaloneSignature !== null ? 1 : 0);

  const allRequiredFilled =
    nonSignatureFilledCount === requiredNonSignatureFields.length;

  const canProceed = allRequiredFilled && signatureReady;
  const progressText = labels.progressFormat(filledTotal, requiredTotal);

  const documentTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of documents) {
      map.set(doc.id, doc.title);
    }
    return map;
  }, [documents]);

  const fieldsByDocument = useMemo(() => {
    if (!hasMultipleDocuments) return null;
    const grouped = new Map<string, SignerField[]>();
    for (const field of nonSignatureFields) {
      const existing = grouped.get(field.documentId);
      if (existing) {
        existing.push(field);
      } else {
        grouped.set(field.documentId, [field]);
      }
    }
    return grouped;
  }, [nonSignatureFields, hasMultipleDocuments]);

  const primarySignatureFieldId = signatureFields[0]?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <p className="text-center text-xs text-foreground-muted md:text-sm">
          {labels.instruction}
        </p>

        {hasSignatureGroup ? (
          <Card variant="glass" className="w-full max-w-md space-y-4 p-4 md:p-5">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-foreground-subtle" />
              <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                {labels.yourSignature}
              </p>
            </div>
            {hasNonSignatureFields ? null : (
              <p className="text-xs text-foreground-subtle">{progressText}</p>
            )}

            {signatureFilled && signaturePreview ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (primarySignatureFieldId) {
                      onFieldClick(primarySignatureFieldId);
                    }
                  }}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-left transition active:scale-[0.98]"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/20">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-success">
                        {fieldTypeLabels.signature ?? 'signature'}
                      </p>
                      <p className="text-[10px] text-foreground-subtle">
                        {labels.filled}
                        {' · '}
                        {signaturePagesLabel}
                      </p>
                    </div>
                    <div className="flex h-8 w-12 items-center justify-center overflow-hidden rounded border border-success/20 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signaturePreview}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (primarySignatureFieldId) {
                      onFieldClick(primarySignatureFieldId);
                    }
                  }}
                  className="text-xs text-primary"
                >
                  <PenTool className="mr-1.5 h-3.5 w-3.5" />
                  {labels.changeSignature}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (primarySignatureFieldId) {
                      onFieldClick(primarySignatureFieldId);
                    }
                  }}
                  className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-th-border bg-th-hover transition-all hover:border-primary/40 hover:bg-th-active"
                >
                  <div className="flex flex-col items-center gap-1.5 text-foreground-subtle">
                    <PenTool className="h-6 w-6" />
                    <span className="text-xs font-medium">{labels.drawSignature}</span>
                    <span className="text-[10px]">{signaturePagesLabel}</span>
                  </div>
                </button>
                {signatureRequired ? (
                  <p className="text-[10px] text-warning/70">
                    {labels.signatureRequired}
                  </p>
                ) : null}
              </div>
            )}
          </Card>
        ) : null}

        {hasNonSignatureFields && hasMultipleDocuments && fieldsByDocument ? (
          <div className="w-full max-w-md space-y-3">
            {Array.from(fieldsByDocument.entries()).map(([docId, docFields]) => (
              <Card key={docId} variant="glass" className="w-full p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                  <p className="truncate text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                    {labels.documentGroup(documentTitleMap.get(docId) ?? docId)}
                  </p>
                </div>
                <FieldListPanel
                  fields={docFields}
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
            ))}
          </div>
        ) : null}

        {hasNonSignatureFields && !hasMultipleDocuments ? (
          <Card variant="glass" className="w-full max-w-md p-4 md:p-5">
            <FieldListPanel
              fields={nonSignatureFields}
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
                  className="text-xs text-primary"
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
                  className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-th-border bg-th-hover transition-all hover:border-primary/40 hover:bg-th-active"
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
