"use client";

import { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  User,
  Check,
  PenTool,
  Fingerprint,
  Type,
  Calendar,
  FileText as FileTextIcon,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Avatar, Badge, Button, Card } from '@/shared/ui';
import type { SignerField, SignerWithEnvelope } from '@/features/signing/api';

type DocumentItem = Readonly<{
  id: string;
  title: string;
}>;

type ReviewStepProps = Readonly<{
  signerData: SignerWithEnvelope;
  documents: readonly DocumentItem[];
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  standaloneSignature: string | null;
  onRequestSignature: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onViewDocument: () => void;
  isSubmitting: boolean;
  labels: Readonly<{
    title: string;
    documentTitle: string;
    documentsLabel: string;
    signerInfo: string;
    signingAs: string;
    roleLabel: string;
    filledFields: string;
    fieldPreviewFormat: (type: string, page: number) => string;
    viewDocument: string;
    consentLabel: string;
    consentRequired: string;
    signAction: string;
    signing: string;
    back: string;
    changeSignature: string;
    yourSignature: string;
  }>;
  fieldTypeLabels: Readonly<Record<string, string>>;
}>;

const FIELD_ICONS: Record<string, typeof PenTool> = {
  signature: PenTool,
  initials: Fingerprint,
  name: Type,
  date: Calendar,
  text: FileTextIcon,
};

export function ReviewStep({
  signerData,
  documents,
  fields,
  fieldValues,
  standaloneSignature,
  onRequestSignature,
  onBack,
  onSubmit,
  onViewDocument,
  isSubmitting,
  labels,
  fieldTypeLabels,
}: ReviewStepProps) {
  const [consentAccepted, setConsentAccepted] = useState(false);

  const filledFields = fields.filter(
    (f) => (fieldValues[f.id] ?? f.value ?? '').length > 0
  );

  const hasSignatureField = filledFields.some(
    (f) => f.type === 'signature' || f.type === 'initials'
  );
  const hasSignature = hasSignatureField || standaloneSignature !== null;
  const totalFilledCount = filledFields.length + (standaloneSignature === null ? 0 : 1);

  const canSubmit = consentAccepted && hasSignature && !isSubmitting;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl space-y-4 overflow-auto pb-24 md:pb-4">
        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                {documents.length > 1 ? labels.documentsLabel : labels.documentTitle}
              </p>
              {documents.length > 1 ? (
                <div className="space-y-1 pt-0.5">
                  {documents.map((doc) => (
                    <p key={doc.id} className="flex items-center gap-1.5 text-sm font-medium">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-foreground-muted" />
                      {doc.title}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {signerData.envelope.title}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={onViewDocument}
              className="gap-1.5 self-start text-xs text-primary hover:text-primary/80"
            >
              <Eye className="h-3.5 w-3.5" />
              {labels.viewDocument}
            </Button>
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Avatar name={signerData.signer.name} size="md" />
            <div className="flex-1">
              <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                {labels.signerInfo}
              </p>
              <p className="text-sm font-medium">
                {signerData.signer.name}
              </p>
              <p className="text-xs text-foreground-muted">
                {signerData.signer.email}
              </p>
            </div>
            <Badge variant="info" className="shrink-0 text-xs">
              {labels.signingAs}: {labels.roleLabel}
            </Badge>
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-foreground-subtle" />
            <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
              {labels.filledFields}
            </p>
            <Badge variant="success" className="ml-auto">
              {totalFilledCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {filledFields.map((field) => {
              const value = fieldValues[field.id] ?? field.value ?? '';
              const Icon = FIELD_ICONS[field.type] ?? PenTool;
              return (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-success" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success">
                      {fieldTypeLabels[field.type] ?? field.type}
                    </p>
                    <p className="text-[10px] text-foreground-subtle">
                      {labels.fieldPreviewFormat(
                        fieldTypeLabels[field.type] ?? field.type,
                        field.page
                      )}
                    </p>
                  </div>
                  {value.startsWith('data:image/') ? (
                    <div className="flex h-8 w-14 items-center justify-center overflow-hidden rounded border border-success/20 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={value}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <Check className="h-4 w-4 shrink-0 text-success" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {standaloneSignature ? (
          <Card variant="glass" className="space-y-3 p-4 md:p-6">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-foreground-subtle" />
              <p className="text-[10px] font-normal uppercase tracking-widest text-foreground-subtle">
                {labels.yourSignature}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-success/20 bg-white p-2">
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
                <PenTool className="mr-1 h-3.5 w-3.5" />
                {labels.changeSignature}
              </Button>
            </div>
          </Card>
        ) : null}

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-th-input-border bg-th-input accent-primary"
              />
              <span className="text-xs leading-relaxed text-foreground-muted md:text-sm">
                {labels.consentLabel}
              </span>
            </label>
          </div>
          {consentAccepted ? null : (
            <p className="pl-8 text-[10px] text-warning/70">
              {labels.consentRequired}
            </p>
          )}
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-th-border bg-th-card/95 px-4 py-3 backdrop-blur-sm">
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
          onClick={onSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
          className="min-h-[44px]"
        >
          <PenTool className="h-4 w-4" />
          {isSubmitting ? labels.signing : labels.signAction}
        </Button>
      </div>
    </div>
  );
}
