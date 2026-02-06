"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Stepper, Button } from '@/shared/ui';
import { SignersStep } from './signers-step';
import { FieldsStep } from './fields-step';
import { ReviewStep } from './review-step';

export type WizardStepId = 'signers' | 'fields' | 'review';

export type DocumentWizardProps = {
  readonly documentId: string;
};

export function DocumentWizard({ documentId }: Readonly<DocumentWizardProps>) {
  const tWizard = useTranslations('wizard');
  const [step, setStep] = useState<WizardStepId>('signers');

  const steps = useMemo(
    () => [
      {
        id: 'signers',
        label: tWizard('steps.signers'),
        status: step === 'signers' ? 'active' : step === 'fields' || step === 'review' ? 'completed' : 'pending',
      },
      {
        id: 'fields',
        label: tWizard('steps.fields'),
        status: step === 'fields' ? 'active' : step === 'review' ? 'completed' : 'pending',
      },
      {
        id: 'review',
        label: tWizard('steps.review'),
        status: step === 'review' ? 'active' : 'pending',
      },
    ],
    [step, tWizard]
  );

  return (
    <div className="space-y-6">
      <Stepper steps={steps.map(({ label, status }) => ({ label, status }))} />
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
          onClick={() => setStep('signers')}
          className="text-xs"
        >
          {tWizard('restart')}
        </Button>
      </div>
    </div>
  );
}
