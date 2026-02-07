"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, Users, LayoutGrid, CheckCircle } from 'lucide-react';
import { Stepper, Button } from '@/shared/ui';
import { UploadStep } from './upload-step';
import { SignersStep } from './signers-step';
import { FieldsStep } from './fields-step';
import { ReviewStep } from './review-step';

export type WizardStepId = 'upload' | 'signers' | 'fields' | 'review';

const STEP_ICONS: Record<WizardStepId, React.ReactNode> = {
  upload: <FileUp className="h-5 w-5" />,
  signers: <Users className="h-5 w-5" />,
  fields: <LayoutGrid className="h-5 w-5" />,
  review: <CheckCircle className="h-5 w-5" />,
};

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

  const stepOrder: WizardStepId[] = useMemo(
    () => ['upload', 'signers', 'fields', 'review'],
    []
  );

  const currentIndex = stepOrder.indexOf(step);

  const steps = useMemo(() => {
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
        icon: STEP_ICONS[id],
      };
    });
  }, [step, tWizard, stepOrder, currentIndex]);

  const counterLabel = tWizard('progressCounter', {
    current: currentIndex + 1,
    total: stepOrder.length,
  });

  return (
    <div className="space-y-6">
      <Stepper
        steps={steps.map(({ label, status, icon }) => ({ label, status, icon }))}
        progressLabel={tWizard('progress')}
        counterLabel={counterLabel}
      />
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
