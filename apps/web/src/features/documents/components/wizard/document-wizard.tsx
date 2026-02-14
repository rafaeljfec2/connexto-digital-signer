"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, Users, PenTool, Settings, CheckCircle } from 'lucide-react';
import { useEnvelopeDocuments } from '@/features/documents/hooks/use-document-wizard';
import { Stepper } from '@/shared/ui';
import { StepTransition } from '@/shared/animations';
import { UploadStep } from './upload-step';
import { SignersStep } from './signers-step';
import { FieldsStep } from './fields-step';
import { SettingsStep } from './settings-step';
import { ReviewStep } from './review-step';

export type WizardStepId = 'upload' | 'signers' | 'fields' | 'settings' | 'review';

const STEP_ORDER: WizardStepId[] = ['upload', 'signers', 'fields', 'settings', 'review'];

const STEP_ICONS: Record<WizardStepId, React.ReactNode> = {
  upload: <FileUp className="h-5 w-5" />,
  signers: <Users className="h-5 w-5" />,
  fields: <PenTool className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  review: <CheckCircle className="h-5 w-5" />,
};

export type DocumentWizardProps = Readonly<{
  envelopeId: string;
  documentId: string;
  hasFile: boolean;
  onCancel: () => void;
  onSendSuccess?: (envelopeId: string) => void;
}>;

export function DocumentWizard({ envelopeId, documentId, hasFile, onCancel, onSendSuccess }: DocumentWizardProps) {
  const tWizard = useTranslations('wizard');
  const documentsQuery = useEnvelopeDocuments(envelopeId);
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);
  const [uploadComplete, setUploadComplete] = useState(hasFile);
  const [step, setStep] = useState<WizardStepId>(hasFile ? 'signers' : 'upload');
  const prevIndexRef = useRef(STEP_ORDER.indexOf(step));

  const currentIndex = STEP_ORDER.indexOf(step);
  const direction: 1 | -1 = currentIndex >= prevIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (hasFile && !uploadComplete) {
      setUploadComplete(true);
      if (step === 'upload') setStep('signers');
    }
  }, [hasFile, step, uploadComplete]);

  useEffect(() => {
    if (!uploadComplete && step !== 'upload') setStep('upload');
  }, [step, uploadComplete]);

  const steps = useMemo(() => {
    return STEP_ORDER.map((id, index) => {
      let status: 'completed' | 'active' | 'pending';
      if (index < currentIndex) {
        status = 'completed';
      } else if (index === currentIndex) {
        status = 'active';
      } else {
        status = 'pending';
      }
      return {
        id,
        label: tWizard(`steps.${id}`),
        status,
        icon: STEP_ICONS[id],
      };
    });
  }, [tWizard, currentIndex]);

  const counterLabel = tWizard('progressCounter', {
    current: currentIndex + 1,
    total: STEP_ORDER.length,
  });

  const handleStepClick = useCallback(
    (index: number) => {
      if (index < currentIndex) {
        setStep(STEP_ORDER[index]);
      }
    },
    [currentIndex],
  );

  return (
    <div className="space-y-6">
      <Stepper
        steps={steps.map(({ label, status, icon }) => ({ label, status, icon }))}
        progressLabel={tWizard('progress')}
        counterLabel={counterLabel}
        onStepClick={handleStepClick}
      />
      <StepTransition stepKey={step} direction={direction}>
        {step === 'upload' ? (
          <UploadStep
            envelopeId={envelopeId}
            documentId={documentId}
            hasFile={uploadComplete}
            onRestart={() => setStep('upload')}
            onCancel={onCancel}
            onNext={() => {
              setUploadComplete(true);
              setStep('signers');
            }}
          />
        ) : null}
        {step === 'signers' ? (
          <SignersStep
            envelopeId={envelopeId}
            onBack={() => setStep('upload')}
            onRestart={() => setStep('upload')}
            onCancel={onCancel}
            onNext={() => setStep('fields')}
          />
        ) : null}
        {step === 'fields' ? (
          <FieldsStep
            envelopeId={envelopeId}
            documents={documents}
            onBack={() => setStep('signers')}
            onRestart={() => setStep('upload')}
            onCancel={onCancel}
            onNext={() => setStep('settings')}
          />
        ) : null}
        {step === 'settings' ? (
          <SettingsStep
            envelopeId={envelopeId}
            onBack={() => setStep('fields')}
            onRestart={() => setStep('upload')}
            onCancel={onCancel}
            onNext={() => setStep('review')}
          />
        ) : null}
        {step === 'review' ? (
          <ReviewStep
            envelopeId={envelopeId}
            documents={documents}
            onBack={() => setStep('settings')}
            onRestart={() => setStep('upload')}
            onCancel={onCancel}
            onSendSuccess={onSendSuccess}
          />
        ) : null}
      </StepTransition>
    </div>
  );
}
