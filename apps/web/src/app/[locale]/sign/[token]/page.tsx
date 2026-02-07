"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Avatar, Badge, Card } from '@/shared/ui';
import {
  useSignerData,
  useSignerPdf,
  useSignerFields,
  useAcceptSignature,
} from '@/features/signing/hooks';
import { SignStepper } from './components/sign-stepper';
import type { SignStep } from './components/sign-stepper';
import { ViewStep } from './components/view-step';
import { FillFieldsStep } from './components/fill-fields-step';
import { ReviewStep } from './components/review-step';
import { SignatureModal } from './components/signature-modal';

export default function SignerDocumentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const t = useTranslations('signer');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const currentLocale = useLocale();

  const signerQuery = useSignerData(token);
  const pdfQuery = useSignerPdf(token);
  const fieldsQuery = useSignerFields(token);
  const acceptMutation = useAcceptSignature(token);

  const [currentStep, setCurrentStep] = useState<SignStep>('view');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  useEffect(() => {
    const signingLang = signerQuery.data?.document.signingLanguage;
    if (signingLang && signingLang !== currentLocale) {
      globalThis.location.href = `/${signingLang}/sign/${token}`;
    }
  }, [signerQuery.data?.document.signingLanguage, currentLocale, token]);

  const signerData = signerQuery.data;
  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const alreadySigned = signerData?.signer.status === 'signed';

  const fileUrl = useMemo(() => {
    if (!pdfQuery.data) return '';
    return URL.createObjectURL(pdfQuery.data);
  }, [pdfQuery.data]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const handleFieldClick = useCallback(
    (fieldId: string) => {
      if (alreadySigned) return;
      setActiveFieldId(fieldId);
    },
    [alreadySigned]
  );

  const handleSignatureConfirm = useCallback(
    (value: string) => {
      if (!activeFieldId) return;
      setFieldValues((prev) => ({ ...prev, [activeFieldId]: value }));
      setActiveFieldId(null);
    },
    [activeFieldId]
  );

  const handleSubmit = async () => {
    const fieldPayload = fields
      .filter((f) => (fieldValues[f.id] ?? '').length > 0)
      .map((f) => ({
        fieldId: f.id,
        value: fieldValues[f.id],
      }));

    await acceptMutation.mutateAsync({
      consent: t('consent.label'),
      fields: fieldPayload,
    });

    router.push('/success');
  };

  const fieldTypeLabels = useMemo(
    () => ({
      signature: t('fieldType.signature'),
      initials: t('fieldType.initials'),
      name: t('fieldType.name'),
      date: t('fieldType.date'),
      text: t('fieldType.text'),
    }),
    [t]
  );

  const signaturePadLabels = useMemo(
    () => ({
      title: t('signaturePad.title'),
      draw: t('signaturePad.draw'),
      type: t('signaturePad.type'),
      clear: t('signaturePad.clear'),
      cancel: t('signaturePad.cancel'),
      confirm: t('signaturePad.confirm'),
      placeholder: t('signaturePad.placeholder'),
      drawHint: t('signaturePad.drawHint'),
      typeHint: t('signaturePad.typeHint'),
    }),
    [t]
  );

  if (signerQuery.isLoading || pdfQuery.isLoading || fieldsQuery.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-main text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-sm text-neutral-100/70">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (signerQuery.isError || !signerData) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-main px-4 text-white">
        <Card variant="glass" className="max-w-sm space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/20">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <p className="text-lg font-semibold">{t('error')}</p>
          <p className="text-sm text-neutral-100/60">{t('errorSubtitle')}</p>
        </Card>
      </div>
    );
  }

  const { signer, document: doc } = signerData;

  if (alreadySigned) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-main px-4 text-white">
        <Card variant="glass" className="max-w-sm space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
            <Check className="h-6 w-6 text-success" />
          </div>
          <p className="text-lg font-semibold">{t('alreadySigned')}</p>
          <p className="text-sm text-neutral-100/60">{t('alreadySignedSubtitle')}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <ShieldCheck className="h-4 w-4 text-success/60" />
            <span className="text-xs text-neutral-100/40">ICP-Brasil</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-main text-white">
      <header className="border-b border-white/10 px-3 py-2.5 md:px-6 md:py-3">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-neutral-100/50">
              {tCommon('appName')}
            </div>
            <div className="truncate text-xs font-semibold md:text-sm">
              {doc.title}
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={signer.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{signer.name}</p>
              <p className="truncate text-[10px] text-neutral-100/50">
                {signer.email}
              </p>
            </div>
          </div>
          <Badge variant="info" className="shrink-0">
            {t('status.pending')}
          </Badge>
        </div>
      </header>

      <div className="border-b border-white/5 px-4 py-2 md:px-6 md:py-3">
        <div className="mx-auto max-w-6xl">
          <SignStepper
            currentStep={currentStep}
            labels={{
              view: t('steps.view'),
              fill: t('steps.fill'),
              review: t('steps.review'),
            }}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-2 pb-20 md:px-6 md:pb-4">
        {currentStep === 'view' ? (
          <ViewStep
            fileUrl={fileUrl}
            fields={fields}
            labels={{
              instruction: t('viewStep.instruction'),
              next: t('viewStep.next'),
              clickToSign: t('clickToSign'),
              clickToInitials: t('clickToInitials'),
            }}
            onNext={() => setCurrentStep('fill')}
          />
        ) : null}

        {currentStep === 'fill' ? (
          <FillFieldsStep
            fileUrl={fileUrl}
            fields={fields}
            fieldValues={fieldValues}
            onFieldClick={handleFieldClick}
            onNext={() => setCurrentStep('review')}
            onBack={() => setCurrentStep('view')}
            labels={{
              instruction: t('fillStep.instruction'),
              progressFormat: (filled: number, total: number) =>
                t('fieldsProgress', { filled, total }),
              required: t('fillStep.required'),
              optional: t('fillStep.optional'),
              filled: t('fillStep.filled'),
              tapToFill: t('fillStep.tapToFill'),
              next: t('fillStep.next'),
              back: t('back'),
              clickToSign: t('clickToSign'),
              clickToInitials: t('clickToInitials'),
            }}
            fieldTypeLabels={fieldTypeLabels}
          />
        ) : null}

        {currentStep === 'review' ? (
          <ReviewStep
            signerData={signerData}
            fields={fields}
            fieldValues={fieldValues}
            onBack={() => setCurrentStep('fill')}
            onSubmit={handleSubmit}
            isSubmitting={acceptMutation.isPending}
            labels={{
              title: t('reviewStep.title'),
              documentTitle: t('reviewStep.documentTitle'),
              signerInfo: t('reviewStep.signerInfo'),
              filledFields: t('reviewStep.filledFields'),
              fieldPreview: t('reviewStep.fieldPreview'),
              consentLabel: t('consent.label'),
              consentRequired: t('consent.required'),
              signAction: t('signAction'),
              signing: t('signing'),
              back: t('back'),
            }}
            fieldTypeLabels={fieldTypeLabels}
          />
        ) : null}
      </main>

      <SignatureModal
        open={activeFieldId !== null}
        labels={signaturePadLabels}
        onConfirm={handleSignatureConfirm}
        onClose={() => setActiveFieldId(null)}
      />
    </div>
  );
}
