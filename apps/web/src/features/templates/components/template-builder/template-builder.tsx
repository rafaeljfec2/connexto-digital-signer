'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/shared/ui';
import { PageTransition, FadeIn } from '@/shared/animations';
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
import type { CreateTemplateInput, AddTemplateSignerInput, TemplateVariableInput, TemplateDetail } from '../../api';
import { InfoStep } from './info-step';
import { DocumentsStep } from './documents-step';
import { SignersStep } from './signers-step';
import { VariablesStep } from './variables-step';

const STEPS = ['info', 'documents', 'signers', 'variables'] as const;

type PendingFile = {
  readonly file: File;
  readonly title: string;
};

type TemplateData = {
  readonly documents: ReadonlyArray<unknown>;
  readonly signers: ReadonlyArray<unknown>;
  readonly variables: ReadonlyArray<unknown>;
};

function stepButtonClass(index: number, currentStep: number): string {
  if (index === currentStep) return 'bg-primary text-white';
  if (index < currentStep) return 'bg-primary/10 text-primary cursor-pointer';
  return 'bg-th-hover text-foreground-muted';
}

type BuilderStepContentProps = {
  readonly currentStep: (typeof STEPS)[number];
  readonly formData: CreateTemplateInput;
  readonly onFormChange: (data: CreateTemplateInput) => void;
  readonly template: TemplateDetail | undefined;
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

function BuilderStepContent(props: BuilderStepContentProps) {
  switch (props.currentStep) {
    case 'info':
      return <InfoStep data={props.formData} onChange={props.onFormChange} />;
    case 'documents':
      return (
        <DocumentsStep
          documents={props.template?.documents ?? []}
          pendingFiles={[...props.pendingFiles]}
          onAddFiles={props.onAddFiles}
          onRemoveDocument={props.onRemoveDocument}
          onRemovePending={props.onRemovePending}
        />
      );
    case 'signers':
      return (
        <SignersStep
          signers={props.template?.signers ?? []}
          onAdd={props.onAddSigner}
          onRemove={props.onRemoveSigner}
          isAdding={props.isAddingSigner}
        />
      );
    case 'variables':
      return (
        <VariablesStep
          variables={props.template?.variables ?? []}
          onSave={props.onSaveVariables}
          isSaving={props.isSavingVariables}
        />
      );
    default:
      return null;
  }
}

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

  const handleNext = useCallback(async () => {
    if (step === 0 && !createdId) {
      const created = await createMutation.mutateAsync(formData);
      setCreatedId(created.id);
      setStep(1);
      return;
    }

    if (step === 0 && createdId) {
      await updateMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        category: formData.category,
      });
      setStep(1);
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
      setStep(2);
      return;
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }, [step, createdId, formData, pendingFiles, createMutation, updateMutation, addDocMutation]);

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-foreground">
            {isEdit ? t('builder.editTitle') : t('builder.title')}
          </h1>
          <Button type="button" variant="ghost" onClick={handleFinish}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('title')}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            return (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (isDone) setStep(i); }}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${stepButtonClass(i, step)}`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : null}
                  {t(`builder.steps.${s}`)}
                </button>
                {i < STEPS.length - 1 ? (
                  <div className="h-px w-4 bg-th-border" />
                ) : null}
              </div>
            );
          })}
        </div>
      </FadeIn>

      <div className="glass-card rounded-2xl p-6">
        <BuilderStepContent
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

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={handleBack}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            disabled={!canProceed || isLoading}
            onClick={handleNext}
          >
            {isLoading ? '...' : 'Next'}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={handleFinish}>
            <Check className="mr-1.5 h-4 w-4" />
            Done
          </Button>
        )}
      </div>
    </PageTransition>
  );
}
