"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Stepper, Button } from '@/shared/ui';
import { UploadStep } from './upload-step';
import { SignersStep } from './signers-step';
import { FieldsStep } from './fields-step';
import { ReviewStep } from './review-step';

export type WizardStepId = 'upload' | 'signers' | 'fields' | 'review';

export type DocumentWizardProps = {
  readonly documentId: string;
  readonly hasFile: boolean;
};

export function DocumentWizard({ documentId, hasFile }: Readonly<DocumentWizardProps>) {
  const tWizard = useTranslations('wizard');
  const [uploadComplete, setUploadComplete] = useState(hasFile);
  const [step, setStep] = useState<WizardStepId>(hasFile ? 'signers' : 'upload');

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
    const stepOrder: WizardStepId[] = ['upload', 'signers', 'fields', 'review'];
    const currentIndex = stepOrder.indexOf(step);
    return stepOrder.map((id, index) => {
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
      };
    });
  }, [step, tWizard]);

  return (
    <div className="space-y-6">
      <Stepper steps={steps.map(({ label, status }) => ({ label, status }))} />
      {step === 'upload' ? (
        <UploadStep
          documentId={documentId}
          hasFile={uploadComplete}
          onNext={() => {
            setUploadComplete(true);
            setStep('signers');
          }}
        />
      ) : null}
      {step === 'signers' ? (
        <SignersStep documentId={documentId} onNext={() => setStep('fields')} />
      ) : null}
      {step === 'fields' ? (
        <FieldsStep
          documentId={documentId}
          onBack={() => setStep('signers')}
          onNext={() => setStep('review')}
        />
      ) : null}
      {step === 'review' ? (
        <ReviewStep documentId={documentId} onBack={() => setStep('fields')} />
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{tWizard('hint')}</span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(uploadComplete ? 'signers' : 'upload')}
          className="text-xs"
        >
          {tWizard('restart')}
        </Button>
      </div>
    </div>
  );
}
