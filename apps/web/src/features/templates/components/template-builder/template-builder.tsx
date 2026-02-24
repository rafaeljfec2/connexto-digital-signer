'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Info,
  Users,
  Variable,
} from 'lucide-react';
import { Button, Stepper } from '@/shared/ui';
import type { StepperItem } from '@/shared/ui/stepper';
import { PageTransition, StepTransition } from '@/shared/animations';
import {
  useCreateTemplate,
  useTemplate,
  useUpdateTemplate,
  useAddTemplateDocument,
  useRemoveTemplateDocument,
  useAddTemplateSigner,
  useRemoveTemplateSigner,
  useBatchUpdateTemplateVariables,
} from '../../hooks';
import type {
  CreateTemplateInput,
  AddTemplateSignerInput,
  TemplateVariableInput,
} from '../../api';
import { InfoStep } from './info-step';
import { DocumentsStep } from './documents-step';
import { SignersStep } from './signers-step';
import { VariablesStep } from './variables-step';

const STEPS = ['info', 'documents', 'signers', 'variables'] as const;

const STEP_ICONS = [
  <Info key="info" className="h-5 w-5" />,
  <FileText key="docs" className="h-5 w-5" />,
  <Users key="signers" className="h-5 w-5" />,
  <Variable key="vars" className="h-5 w-5" />,
];

function stepStatus(index: number, current: number): 'completed' | 'active' | 'pending' {
  if (index < current) return 'completed';
  if (index === current) return 'active';
  return 'pending';
}

type PendingFile = {
  readonly file: File;
  readonly title: string;
};

type TemplateData = {
  readonly documents: ReadonlyArray<unknown>;
  readonly signers: ReadonlyArray<unknown>;
  readonly variables: ReadonlyArray<unknown>;
};

function computeCanProceed(
  step: number,
  formData: CreateTemplateInput,
  template: TemplateData | undefined,
  pendingFiles: ReadonlyArray<PendingFile>,
): boolean {
  if (step === 0) return formData.name.trim().length > 0;
  if (step === 1) return (template?.documents.length ?? 0) > 0 || pendingFiles.length > 0;
  return true;
}

type TemplateBuilderProps = {
  readonly templateId?: string;
};

export function TemplateBuilder({ templateId }: TemplateBuilderProps) {
  const t = useTranslations('templates');
  const router = useRouter();
  const isEdit = Boolean(templateId);

  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const direction: 1 | -1 = step > prevStepRef.current ? 1 : -1;

  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: '',
    description: undefined,
    category: undefined,
  });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(templateId ?? null);

  const templateQuery = useTemplate(createdId ?? '');
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate(createdId ?? '');
  const addDocMutation = useAddTemplateDocument(createdId ?? '');
  const removeDocMutation = useRemoveTemplateDocument(createdId ?? '');
  const addSignerMutation = useAddTemplateSigner(createdId ?? '');
  const removeSignerMutation = useRemoveTemplateSigner(createdId ?? '');
  const updateVarsMutation = useBatchUpdateTemplateVariables(createdId ?? '');

  const template = templateQuery.data;

  const goToStep = useCallback((next: number) => {
    prevStepRef.current = step;
    setStep(next);
  }, [step]);

  const handleNext = useCallback(async () => {
    if (step === 0 && !createdId) {
      const created = await createMutation.mutateAsync(formData);
      setCreatedId(created.id);
      prevStepRef.current = 0;
      setStep(1);
      return;
    }

    if (step === 0 && createdId) {
      await updateMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        category: formData.category,
      });
      goToStep(1);
      return;
    }

    if (step === 1 && createdId) {
      for (const pf of pendingFiles) {
        await addDocMutation.mutateAsync({
          file: pf.file,
          title: pf.title,
          position: 0,
        });
      }
      setPendingFiles([]);
      goToStep(2);
      return;
    }

    if (step < STEPS.length - 1) {
      goToStep(step + 1);
    }
  }, [step, createdId, formData, pendingFiles, createMutation, updateMutation, addDocMutation, goToStep]);

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  const handleFinish = () => {
    router.push('/templates');
  };

  const handleAddFiles = (files: File[]) => {
    const newPending = files.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
    }));
    setPendingFiles([...pendingFiles, ...newPending]);
  };

  const handleAddSigner = (input: AddTemplateSignerInput) => {
    addSignerMutation.mutate(input);
  };

  const handleRemoveSigner = (signerId: string) => {
    removeSignerMutation.mutate(signerId);
  };

  const handleSaveVariables = (variables: ReadonlyArray<TemplateVariableInput>) => {
    updateVarsMutation.mutate([...variables]);
  };

  const canProceed = computeCanProceed(step, formData, template, pendingFiles);

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    addDocMutation.isPending;

  const currentStep = STEPS[step];

  const stepperItems: StepperItem[] = useMemo(
    () =>
      STEPS.map((s, i) => ({
        label: t(`builder.steps.${s}`),
        icon: i < step ? <Check className="h-5 w-5" /> : STEP_ICONS[i],
        status: stepStatus(i, step),
      })),
    [step, t],
  );

  const stepDescriptions: Record<string, string> = useMemo(
    () => ({
      info: t('builder.stepDescriptions.info'),
      documents: t('builder.stepDescriptions.documents'),
      signers: t('builder.stepDescriptions.signers'),
      variables: t('builder.stepDescriptions.variables'),
    }),
    [t],
  );

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {isEdit ? t('builder.editTitle') : t('builder.title')}
          </h1>
          <p className="text-sm text-foreground-muted">
            {stepDescriptions[currentStep]}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={handleFinish} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('title')}
        </Button>
      </div>

      <Stepper
        steps={stepperItems}
        progressLabel={t('builder.progress')}
        counterLabel={`${step + 1} / ${STEPS.length}`}
        onStepClick={(i) => { if (i < step) goToStep(i); }}
      />

      <StepTransition stepKey={currentStep} direction={direction}>
        <div className="glass-card space-y-6 rounded-2xl p-6">
          <StepContent
            currentStep={currentStep}
            formData={formData}
            onFormChange={setFormData}
            template={template}
            pendingFiles={pendingFiles}
            onAddFiles={handleAddFiles}
            onRemoveDocument={(docId) => removeDocMutation.mutate(docId)}
            onRemovePending={(i) => setPendingFiles(pendingFiles.filter((_, idx) => idx !== i))}
            onAddSigner={handleAddSigner}
            onRemoveSigner={handleRemoveSigner}
            isAddingSigner={addSignerMutation.isPending}
            onSaveVariables={handleSaveVariables}
            isSavingVariables={updateVarsMutation.isPending}
          />
        </div>
      </StepTransition>

      <div className="flex items-center justify-between rounded-2xl border border-th-border bg-th-card/50 p-4">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('builder.back')}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            disabled={!canProceed || isLoading}
            onClick={handleNext}
            className="gap-2"
          >
            {isLoading ? t('builder.saving') : t('builder.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={handleFinish} className="gap-2">
            <Check className="h-4 w-4" />
            {t('builder.finish')}
          </Button>
        )}
      </div>
    </PageTransition>
  );
}

type StepContentProps = {
  readonly currentStep: (typeof STEPS)[number];
  readonly formData: CreateTemplateInput;
  readonly onFormChange: (data: CreateTemplateInput) => void;
  readonly template: { documents: ReadonlyArray<unknown>; signers: ReadonlyArray<unknown>; variables: ReadonlyArray<unknown> } | undefined;
  readonly pendingFiles: ReadonlyArray<PendingFile>;
  readonly onAddFiles: (files: File[]) => void;
  readonly onRemoveDocument: (docId: string) => void;
  readonly onRemovePending: (index: number) => void;
  readonly onAddSigner: (input: AddTemplateSignerInput) => void;
  readonly onRemoveSigner: (signerId: string) => void;
  readonly isAddingSigner: boolean;
  readonly onSaveVariables: (variables: ReadonlyArray<TemplateVariableInput>) => void;
  readonly isSavingVariables: boolean;
};

function StepContent(props: StepContentProps) {
  switch (props.currentStep) {
    case 'info':
      return <InfoStep data={props.formData} onChange={props.onFormChange} />;
    case 'documents':
      return (
        <DocumentsStep
          documents={(props.template?.documents ?? []) as never}
          pendingFiles={[...props.pendingFiles]}
          onAddFiles={props.onAddFiles}
          onRemoveDocument={props.onRemoveDocument}
          onRemovePending={props.onRemovePending}
        />
      );
    case 'signers':
      return (
        <SignersStep
          signers={(props.template?.signers ?? []) as never}
          onAdd={props.onAddSigner}
          onRemove={props.onRemoveSigner}
          isAdding={props.isAddingSigner}
        />
      );
    case 'variables':
      return (
        <VariablesStep
          variables={(props.template?.variables ?? []) as never}
          onSave={props.onSaveVariables}
          isSaving={props.isSavingVariables}
        />
      );
    default:
      return null;
  }
}
