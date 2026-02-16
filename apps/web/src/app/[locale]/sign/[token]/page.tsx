'use client';

import {
  useAcceptSignature,
  useIdentifySigner,
  useSendVerificationCode,
  useSignerData,
  useSignerFields,
  useSignerPdf,
  useVerifyCode,
} from '@/features/signing/hooks';
import { useRouter } from '@/i18n/navigation';
import { Avatar, Badge, Card } from '@/shared/ui';
import { AlertTriangle, Check, FileText, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FillFieldsStep } from './components/fill-fields-step';
import { IdentifyStep } from './components/identify-step';
import { ReviewStep } from './components/review-step';
import type { SignStep } from './components/sign-stepper';
import { SignStepper } from './components/sign-stepper';
import { ValidateStep } from './components/validate-step';
import { ViewStep } from './components/view-step';
import { lazyLoad } from '@/shared/utils/lazy-load';
import { StepTransition } from '@/shared/animations';

const SIGN_STEP_ORDER: SignStep[] = ['identify', 'view', 'fill', 'validate', 'review'];

const PdfPreviewModal = lazyLoad(
  () => import('./components/pdf-preview-modal'),
  'PdfPreviewModal',
  { minHeight: '40vh' },
);

const SignatureModal = lazyLoad(
  () => import('./components/signature-modal'),
  'SignatureModal',
  { minHeight: '40vh' },
);

const FieldInputModal = lazyLoad(
  () => import('./components/field-input-modal'),
  'FieldInputModal',
  { minHeight: '20vh' },
);

const TEXT_INPUT_FIELD_TYPES = new Set(['name', 'date', 'text']);

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 3) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 3)}***@${domain}`;
}

export default function SignerDocumentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const t = useTranslations('signer');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const currentLocale = useLocale();

  const signerQuery = useSignerData(token);
  const fieldsQuery = useSignerFields(token);
  const acceptMutation = useAcceptSignature(token);
  const identifyMutation = useIdentifySigner(token);
  const sendCodeMutation = useSendVerificationCode(token);
  const verifyCodeMutation = useVerifyCode(token);

  const documents = useMemo(
    () => signerQuery.data?.documents ?? [],
    [signerQuery.data?.documents],
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  useEffect(() => {
    if (documents.length > 0 && selectedDocumentId === '') {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  const pdfQuery = useSignerPdf(token, selectedDocumentId);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [standaloneSignature, setStandaloneSignature] = useState<string | null>(null);
  const [showStandaloneSignature, setShowStandaloneSignature] = useState(false);

  useEffect(() => {
    const signingLang = signerQuery.data?.envelope.signingLanguage;
    if (signingLang && signingLang !== currentLocale) {
      globalThis.location.href = `/${signingLang}/sign/${token}`;
    }
  }, [signerQuery.data?.envelope.signingLanguage, currentLocale, token]);

  const signerData = signerQuery.data;
  const allFields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);

  const selectedDocFields = useMemo(
    () =>
      selectedDocumentId
        ? allFields.filter((f) => f.documentId === selectedDocumentId)
        : allFields,
    [allFields, selectedDocumentId],
  );

  const alreadySigned = signerData?.signer.status === 'signed';
  const requiresValidation = signerData?.signer.authMethod === 'email';
  const requiresIdentify = (signerData?.signer.requestEmail ?? false) || (signerData?.signer.requestCpf ?? false) || (signerData?.signer.requestPhone ?? false);
  const hasFields = allFields.length > 0;

  const [currentStep, setCurrentStep] = useState<SignStep>('view');
  const [stepInitialized, setStepInitialized] = useState(false);
  const prevStepIndexRef = useRef(SIGN_STEP_ORDER.indexOf(currentStep));

  const currentStepIndex = SIGN_STEP_ORDER.indexOf(currentStep);
  const stepDirection: 1 | -1 = currentStepIndex >= prevStepIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    if (stepInitialized || !signerData) return;
    if (requiresIdentify) {
      setCurrentStep('identify');
    }
    setStepInitialized(true);
  }, [signerData, requiresIdentify, stepInitialized]);

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
      if (showStandaloneSignature) {
        setStandaloneSignature(value);
        setShowStandaloneSignature(false);
        return;
      }
      if (!activeFieldId) return;
      setFieldValues((prev) => ({ ...prev, [activeFieldId]: value }));
      setActiveFieldId(null);
    },
    [activeFieldId, showStandaloneSignature]
  );

  const hasSignatureField = useMemo(
    () => allFields.some((f) => f.type === 'signature' || f.type === 'initials'),
    [allFields]
  );

  const handleFillNext = useCallback(() => {
    if (requiresValidation) {
      setCurrentStep('validate');
    } else {
      setCurrentStep('review');
    }
  }, [requiresValidation]);

  const handleValidateBack = useCallback(() => {
    setCurrentStep('fill');
  }, []);

  const handleReviewBack = useCallback(() => {
    if (requiresValidation) {
      setCurrentStep('validate');
    } else {
      setCurrentStep('fill');
    }
  }, [requiresValidation]);

  const handleSubmit = async () => {
    const fieldPayload = allFields
      .filter((f) => (fieldValues[f.id] ?? '').length > 0)
      .map((f) => ({
        fieldId: f.id,
        value: fieldValues[f.id],
      }));

    const signaturePayload = standaloneSignature
      ?? allFields
        .filter((f) => f.type === 'signature' && (fieldValues[f.id] ?? '').startsWith('data:image/'))
        .map((f) => fieldValues[f.id])[0];

    await acceptMutation.mutateAsync({
      consent: t('consent.label'),
      fields: fieldPayload,
      signatureData: signaturePayload,
    });

    router.push(`/success?token=${token}`);
  };

  const verifyErrorMessage = useMemo(() => {
    if (!verifyCodeMutation.isError) return null;
    const error = verifyCodeMutation.error as { response?: { data?: { message?: string } } };
    const msg = error?.response?.data?.message ?? '';
    if (msg.includes('expired')) return t('validateStep.expiredCode');
    return t('validateStep.invalidCode');
  }, [verifyCodeMutation.isError, verifyCodeMutation.error, t]);

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

  const fieldInputLabels = useMemo(
    () => ({
      cancel: t('signaturePad.cancel'),
      confirm: t('signaturePad.confirm'),
      nameTitle: t('fieldInput.nameTitle'),
      namePlaceholder: t('fieldInput.namePlaceholder'),
      dateTitle: t('fieldInput.dateTitle'),
      datePlaceholder: t('fieldInput.datePlaceholder'),
      textTitle: t('fieldInput.textTitle'),
      textPlaceholder: t('fieldInput.textPlaceholder'),
    }),
    [t]
  );

  const activeFieldType = useMemo(() => {
    if (!activeFieldId) return null;
    const field = allFields.find((f) => f.id === activeFieldId);
    return field?.type ?? null;
  }, [activeFieldId, allFields]);

  const isTextInputField = activeFieldType !== null && TEXT_INPUT_FIELD_TYPES.has(activeFieldType);
  const isSignatureInputField = activeFieldId !== null && !isTextInputField;

  if (signerQuery.isLoading || fieldsQuery.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
          <p className="text-sm text-foreground-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (signerQuery.isError || !signerData) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] px-4 text-foreground">
        <Card variant="glass" className="max-w-sm space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/20">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <p className="text-lg font-medium">{t('error')}</p>
          <p className="text-sm text-foreground-muted">{t('errorSubtitle')}</p>
        </Card>
      </div>
    );
  }

  const { signer, envelope: env } = signerData;

  if (alreadySigned) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] px-4 text-foreground">
        <Card variant="glass" className="max-w-sm space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
            <Check className="h-6 w-6 text-success" />
          </div>
          <p className="text-lg font-medium">{t('alreadySigned')}</p>
          <p className="text-sm text-foreground-muted">{t('alreadySignedSubtitle')}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <ShieldCheck className="h-4 w-4 text-success/60" />
            <span className="text-xs text-foreground-subtle">ICP-Brasil</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--th-page-bg)] text-foreground">
      <header className="shrink-0 border-b border-th-border px-3 py-2 md:px-6 md:py-3">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-th-hover">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-normal uppercase tracking-[0.15em] text-foreground-subtle">
              {tCommon('appName')}
            </div>
            <div className="truncate text-xs font-medium md:text-sm">{env.title}</div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={signer.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-normal">{signer.name}</p>
              <p className="truncate text-[10px] text-foreground-subtle">{signer.email}</p>
            </div>
          </div>
          <Badge variant="default" className="shrink-0 text-[10px]">
            {t('signingAs')}: {t(`role.${signer.role}`)}
          </Badge>
          {env.expiresAt ? (
            <Badge variant="default" className="hidden shrink-0 text-[10px] sm:inline-flex">
              {t('deadline', {
                date: new Intl.DateTimeFormat(currentLocale, { dateStyle: 'medium' }).format(new Date(env.expiresAt)),
              })}
            </Badge>
          ) : null}
          <Badge variant="info" className="shrink-0 text-xs">
            {t('status.pending')}
          </Badge>
        </div>
      </header>

      <div className="shrink-0 border-b border-th-border px-4 py-1.5 md:px-6 md:py-2">
        <div className="mx-auto max-w-6xl">
          <SignStepper
            currentStep={currentStep}
            showValidation={requiresValidation ?? false}
            showIdentify={requiresIdentify}
            labels={{
              identify: t('steps.identify'),
              view: t('steps.view'),
              fill: t('steps.fill'),
              validate: t('steps.validate'),
              review: t('steps.review'),
            }}
          />
        </div>
      </div>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 pt-6 pb-16 md:px-6 md:pt-8 md:pb-2">
        <StepTransition stepKey={currentStep} direction={stepDirection} className="flex min-h-0 flex-1 flex-col">
        {currentStep === 'identify' && signerData ? (
          <IdentifyStep
            requestEmail={signerData.signer.requestEmail}
            requestCpf={signerData.signer.requestCpf}
            requestPhone={signerData.signer.requestPhone}
            onIdentify={(input) => identifyMutation.mutateAsync(input)}
            onNext={() => setCurrentStep('view')}
            isSubmitting={identifyMutation.isPending}
            labels={{
              title: t('identifyStep.title'),
              instruction: t('identifyStep.instruction'),
              emailLabel: t('identifyStep.emailLabel'),
              emailPlaceholder: t('identifyStep.emailPlaceholder'),
              cpfLabel: t('identifyStep.cpfLabel'),
              cpfPlaceholder: t('identifyStep.cpfPlaceholder'),
              phoneLabel: t('identifyStep.phoneLabel'),
              phonePlaceholder: t('identifyStep.phonePlaceholder'),
              next: t('identifyStep.next'),
              emailRequired: t('identifyStep.emailRequired'),
              cpfRequired: t('identifyStep.cpfRequired'),
              phoneRequired: t('identifyStep.phoneRequired'),
              error: t('identifyStep.error'),
            }}
          />
        ) : null}

        {currentStep === 'view' ? (
          <ViewStep
            fileUrl={fileUrl}
            fields={selectedDocFields}
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={setSelectedDocumentId}
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
            fields={allFields}
            fieldValues={fieldValues}
            standaloneSignature={standaloneSignature}
            requireStandaloneSignature={!hasSignatureField}
            documents={documents}
            onFieldClick={handleFieldClick}
            onRequestSignature={() => setShowStandaloneSignature(true)}
            onNext={handleFillNext}
            onBack={() => setCurrentStep('view')}
            labels={{
              instruction: hasFields ? t('fillStep.instruction') : t('fillStep.signatureOnly'),
              progressFormat: (filled: number, total: number) =>
                t('fieldsProgress', { filled, total }),
              required: t('fillStep.required'),
              optional: t('fillStep.optional'),
              filled: t('fillStep.filled'),
              tapToFill: t('fillStep.tapToFill'),
              next: t('fillStep.next'),
              back: t('back'),
              drawSignature: t('drawSignature'),
              changeSignature: t('changeSignature'),
              signatureRequired: t('signatureRequired'),
              yourSignature: t('yourSignature'),
              documentGroup: (title: string) => t('fillStep.documentGroup', { title }),
            }}
            fieldTypeLabels={fieldTypeLabels}
          />
        ) : null}

        {currentStep === 'validate' ? (
          <ValidateStep
            onSendCode={() => sendCodeMutation.mutateAsync()}
            onVerifyCode={(code) => verifyCodeMutation.mutateAsync(code)}
            onNext={() => setCurrentStep('review')}
            onBack={handleValidateBack}
            isSending={sendCodeMutation.isPending}
            isVerifying={verifyCodeMutation.isPending}
            verifyError={verifyErrorMessage}
            labels={{
              title: t('validateStep.title'),
              instruction: t('validateStep.instruction', { email: maskEmail(signer.email) }),
              sendCode: t('validateStep.sendCode'),
              resendCode: t('validateStep.resendCode'),
              resendInFormat: (seconds: number) => t('validateStep.resendIn', { seconds }),
              placeholder: t('validateStep.placeholder'),
              verify: t('validateStep.verify'),
              invalidCode: t('validateStep.invalidCode'),
              expiredCode: t('validateStep.expiredCode'),
              back: t('validateStep.back'),
            }}
          />
        ) : null}

        {currentStep === 'review' ? (
          <ReviewStep
            signerData={signerData}
            documents={documents}
            fields={allFields}
            fieldValues={fieldValues}
            standaloneSignature={standaloneSignature}
            onRequestSignature={() => setShowStandaloneSignature(true)}
            onBack={handleReviewBack}
            onSubmit={handleSubmit}
            onViewDocument={() => setShowPdfPreview(true)}
            isSubmitting={acceptMutation.isPending}
            labels={{
              title: t('reviewStep.title'),
              documentTitle: t('reviewStep.documentTitle'),
              documentsLabel: t('reviewStep.documentsLabel'),
              signerInfo: t('reviewStep.signerInfo'),
              signingAs: t('signingAs'),
              roleLabel: t(`role.${signer.role}`),
              filledFields: t('reviewStep.filledFields'),
              fieldPreviewFormat: (type: string, page: number) =>
                t('reviewStep.fieldPreview', { type, page }),
              viewDocument: t('reviewStep.viewDocument'),
              consentLabel: t('consent.label'),
              consentRequired: t('consent.required'),
              signAction: t('signAction'),
              signing: t('signing'),
              back: t('back'),
              changeSignature: t('changeSignature'),
              yourSignature: t('yourSignature'),
            }}
            fieldTypeLabels={fieldTypeLabels}
          />
        ) : null}
        </StepTransition>
      </main>

      <SignatureModal
        open={isSignatureInputField || showStandaloneSignature}
        labels={signaturePadLabels}
        onConfirm={handleSignatureConfirm}
        onClose={() => {
          setActiveFieldId(null);
          setShowStandaloneSignature(false);
        }}
      />

      <FieldInputModal
        open={isTextInputField}
        fieldType={(activeFieldType as 'name' | 'date' | 'text') ?? 'text'}
        labels={fieldInputLabels}
        onConfirm={handleSignatureConfirm}
        onClose={() => setActiveFieldId(null)}
      />

      <PdfPreviewModal
        open={showPdfPreview}
        token={token}
        documents={documents}
        fields={allFields}
        fieldValues={fieldValues}
        onClose={() => setShowPdfPreview(false)}
        labels={{
          title: signerData.envelope.title,
          clickToSign: t('clickToSign'),
          clickToInitials: t('clickToInitials'),
        }}
      />
    </div>
  );
}
