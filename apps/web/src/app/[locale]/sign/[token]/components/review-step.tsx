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
} from 'lucide-react';
import { Avatar, Badge, Button, Card } from '@/shared/ui';
import type { SignerField, SignerWithDocument } from '@/features/signing/api';

type ReviewStepProps = Readonly<{
  signerData: SignerWithDocument;
  fields: ReadonlyArray<SignerField>;
  fieldValues: Readonly<Record<string, string>>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  labels: Readonly<{
    title: string;
    documentTitle: string;
    signerInfo: string;
    filledFields: string;
    fieldPreview: string;
    consentLabel: string;
    consentRequired: string;
    signAction: string;
    signing: string;
    back: string;
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
  fields,
  fieldValues,
  onBack,
  onSubmit,
  isSubmitting,
  labels,
  fieldTypeLabels,
}: ReviewStepProps) {
  const [consentAccepted, setConsentAccepted] = useState(false);

  const filledFields = fields.filter(
    (f) => (fieldValues[f.id] ?? f.value ?? '').length > 0
  );

  const canSubmit = consentAccepted && !isSubmitting;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 md:pb-4">
        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400/20 text-accent-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-100/40">
                {labels.documentTitle}
              </p>
              <p className="text-sm font-semibold">
                {signerData.document.title}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Avatar name={signerData.signer.name} size="md" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-100/40">
                {labels.signerInfo}
              </p>
              <p className="text-sm font-semibold">
                {signerData.signer.name}
              </p>
              <p className="text-xs text-neutral-100/60">
                {signerData.signer.email}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-neutral-100/50" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-100/40">
              {labels.filledFields}
            </p>
            <Badge variant="success" className="ml-auto">
              {filledFields.length}
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
                    <p className="text-[10px] text-neutral-100/40">
                      {labels.fieldPreview
                        .replace('{type}', fieldTypeLabels[field.type] ?? field.type)
                        .replace('{page}', String(field.page))}
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

        <Card variant="glass" className="space-y-3 p-4 md:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-white/30 bg-white/10 accent-accent-400"
              />
              <span className="text-xs leading-relaxed text-neutral-100/80 md:text-sm">
                {labels.consentLabel}
              </span>
            </label>
          </div>
          {!consentAccepted ? (
            <p className="pl-8 text-[10px] text-warning/70">
              {labels.consentRequired}
            </p>
          ) : null}
        </Card>
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
