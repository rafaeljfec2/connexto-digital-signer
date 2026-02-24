'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Send, Variable, Users, FileCheck } from 'lucide-react';
import { Button, Stepper } from '@/shared/ui';
import type { StepperItem } from '@/shared/ui/stepper';
import { PageTransition, StepTransition } from '@/shared/animations';
import { useTemplate, useCreateEnvelopeFromTemplate } from '../../hooks';
import { useFolderTree } from '@/features/documents/hooks/use-folders';
import type { SignerAssignment, CreateEnvelopeFromTemplateInput, TemplateDetail } from '../../api';
import type { FolderTreeNode } from '@/features/documents/api';

const STEPS = ['variables', 'signers', 'review'] as const;

const STEP_ICONS = [
  <Variable key="vars" className="h-5 w-5" />,
  <Users key="signers" className="h-5 w-5" />,
  <FileCheck key="review" className="h-5 w-5" />,
];

type FlatFolder = { readonly id: string; readonly name: string; readonly depth: number };

function flattenFolders(
  nodes: ReadonlyArray<FolderTreeNode>,
  depth = 0,
): ReadonlyArray<FlatFolder> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenFolders(node.children, depth + 1),
  ]);
}

function stepStatus(index: number, current: number): 'completed' | 'active' | 'pending' {
  if (index < current) return 'completed';
  if (index === current) return 'active';
  return 'pending';
}

function computeWizardCanProceed(
  step: number,
  allVariablesFilled: boolean,
  allSignersFilled: boolean,
  folderId: string,
): boolean {
  if (step === 0) return allVariablesFilled;
  if (step === 1) return allSignersFilled;
  return folderId.trim().length > 0;
}

function variableInputType(type: string): string {
  if (type === 'number') return 'number';
  if (type === 'date') return 'date';
  return 'text';
}

function VariablesStepContent({
  template,
  variables,
  onUpdateVariable,
  t,
}: {
  readonly template: TemplateDetail;
  readonly variables: Record<string, string>;
  readonly onUpdateVariable: (key: string, value: string) => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">{t('use.variablesDescription')}</p>
      {template.variables.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          {t('detail.noVariables')}
        </p>
      ) : (
        template.variables.map((v) => (
          <div key={v.id}>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground">
              {v.label}
              {v.required ? <span className="text-error">*</span> : null}
            </label>
            <input
              type={variableInputType(v.type)}
              value={variables[v.key] ?? ''}
              onChange={(e) => onUpdateVariable(v.key, e.target.value)}
              placeholder={v.defaultValue ?? `{{${v.key}}}`}
              className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        ))
      )}
    </div>
  );
}

function SignersStepContent({
  template,
  signers,
  onUpdateSigner,
  t,
}: {
  readonly template: TemplateDetail;
  readonly signers: Record<string, SignerAssignment>;
  readonly onUpdateSigner: (label: string, field: keyof SignerAssignment, value: string) => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">{t('use.signersDescription')}</p>
      {template.signers.map((slot) => (
        <div
          key={slot.id}
          className="space-y-3 rounded-xl border border-th-border bg-th-input p-4"
        >
          <p className="text-sm font-medium text-foreground">
            {slot.label}{' '}
            <span className="text-xs text-foreground-muted capitalize">({slot.role})</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={signers[slot.label]?.name ?? ''}
              onChange={(e) => onUpdateSigner(slot.label, 'name', e.target.value)}
              placeholder={t('use.signerNamePlaceholder')}
              className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
            />
            <input
              type="email"
              value={signers[slot.label]?.email ?? ''}
              onChange={(e) => onUpdateSigner(slot.label, 'email', e.target.value)}
              placeholder={t('use.signerEmailPlaceholder')}
              className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewStepContent({
  folderId,
  title,
  message,
  autoSend,
  flatFolders,
  onSetFolderId,
  onSetTitle,
  onSetMessage,
  onSetAutoSend,
  t,
}: {
  readonly folderId: string;
  readonly title: string;
  readonly message: string;
  readonly autoSend: boolean;
  readonly flatFolders: ReadonlyArray<FlatFolder>;
  readonly onSetFolderId: (value: string) => void;
  readonly onSetTitle: (value: string) => void;
  readonly onSetMessage: (value: string) => void;
  readonly onSetAutoSend: (value: boolean) => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('use.folderLabel')} <span className="text-error">*</span>
        </label>
        <select
          value={folderId}
          onChange={(e) => onSetFolderId(e.target.value)}
          className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        >
          <option value="">--</option>
          {flatFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {'  '.repeat(f.depth)}{f.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('use.titleLabel')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onSetTitle(e.target.value)}
          placeholder={t('use.titlePlaceholder')}
          className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('use.messageLabel')}
        </label>
        <textarea
          value={message}
          onChange={(e) => onSetMessage(e.target.value)}
          placeholder={t('use.messagePlaceholder')}
          rows={3}
          className="w-full resize-none rounded-xl border border-th-border bg-th-input px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={autoSend}
          onChange={(e) => onSetAutoSend(e.target.checked)}
          className="rounded border-th-border accent-primary"
        />
        {t('use.autoSend')}
      </label>
    </div>
  );
}

type UseTemplateWizardProps = {
  readonly templateId: string;
};

export function UseTemplateWizard({ templateId }: UseTemplateWizardProps) {
  const t = useTranslations('templates');
  const router = useRouter();

  const templateQuery = useTemplate(templateId);
  const folderTreeQuery = useFolderTree();
  const createMutation = useCreateEnvelopeFromTemplate(templateId);

  const template = templateQuery.data;
  const flatFolders = useMemo(
    () => flattenFolders(folderTreeQuery.data ?? []),
    [folderTreeQuery.data],
  );

  const [step, setStep] = useState(0);
  const directionRef = useRef<1 | -1>(1);

  const goToStep = useCallback((target: number) => {
    directionRef.current = target > step ? 1 : -1;
    setStep(target);
  }, [step]);

  const [variables, setVariables] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Record<string, SignerAssignment>>({});
  const [folderId, setFolderId] = useState('');
  const [title, setTitle] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [message, setMessage] = useState('');

  const updateVariable = useCallback((key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateSigner = useCallback((label: string, field: keyof SignerAssignment, value: string) => {
    setSigners((prev) => ({
      ...prev,
      [label]: { ...prev[label], slotLabel: label, [field]: value } as SignerAssignment,
    }));
  }, []);

  const allVariablesFilled = useMemo(() => {
    if (!template) return false;
    return template.variables
      .filter((v) => v.required)
      .every((v) => {
        const val = variables[v.key];
        return val?.trim() || v.defaultValue?.trim();
      });
  }, [template, variables]);

  const allSignersFilled = useMemo(() => {
    if (!template) return false;
    return template.signers.every((s) => {
      const assignment = signers[s.label];
      return assignment?.name?.trim() && assignment?.email?.trim();
    });
  }, [template, signers]);

  const canProceed = computeWizardCanProceed(step, allVariablesFilled, allSignersFilled, folderId);

  const handleSubmit = useCallback(async () => {
    if (!template || !folderId) return;

    const signerAssignments = template.signers.map((s) => ({
      slotLabel: s.label,
      name: signers[s.label]?.name ?? '',
      email: signers[s.label]?.email ?? '',
    }));

    const input: CreateEnvelopeFromTemplateInput = {
      folderId,
      title: title.trim() || undefined,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      signers: signerAssignments,
      autoSend,
      message: message.trim() || undefined,
    };

    try {
      const result = await createMutation.mutateAsync(input);
      toast.success(autoSend ? t('use.successSent') : t('use.success'));

      if (autoSend) {
        router.push(`/documents/${result.envelopeId}/summary`);
      } else {
        router.push(`/documents/${result.envelopeId}`);
      }
    } catch {
      toast.error(t('use.submitError'));
    }
  }, [template, folderId, title, variables, signers, autoSend, message, createMutation, router, t]);

  const stepperItems: StepperItem[] = useMemo(
    () =>
      STEPS.map((s, i) => ({
        label: t(`use.steps.${s}`),
        icon: i < step ? <Check className="h-5 w-5" /> : STEP_ICONS[i],
        status: stepStatus(i, step),
      })),
    [step, t],
  );

  if (templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const currentStep = STEPS[step];

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('use.title')}</h1>
          <p className="text-sm text-foreground-muted">{template.name}</p>
        </div>
        <Button type="button" variant="ghost" onClick={() => router.push('/templates')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('title')}
        </Button>
      </div>

      <Stepper
        steps={stepperItems}
        progressLabel={t('use.progress')}
        counterLabel={`${step + 1} / ${STEPS.length}`}
        onStepClick={(i) => { if (i < step) goToStep(i); }}
      />

      <StepTransition stepKey={currentStep} direction={directionRef.current}>
        <div className="glass-card space-y-6 rounded-2xl p-6">
          {currentStep === 'variables' && (
            <VariablesStepContent
              template={template}
              variables={variables}
              onUpdateVariable={updateVariable}
              t={t}
            />
          )}
          {currentStep === 'signers' && (
            <SignersStepContent
              template={template}
              signers={signers}
              onUpdateSigner={updateSigner}
              t={t}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStepContent
              folderId={folderId}
              title={title}
              message={message}
              autoSend={autoSend}
              flatFolders={flatFolders}
              onSetFolderId={setFolderId}
              onSetTitle={setTitle}
              onSetMessage={setMessage}
              onSetAutoSend={setAutoSend}
              t={t}
            />
          )}
        </div>
      </StepTransition>

      <div className="flex items-center justify-between rounded-2xl border border-th-border bg-th-card/50 p-4">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => goToStep(step - 1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('builder.back')}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            disabled={!canProceed}
            onClick={() => goToStep(step + 1)}
            className="gap-2"
          >
            {t('builder.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            disabled={!canProceed || createMutation.isPending}
            onClick={handleSubmit}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('use.submitting')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('use.submit')}
              </>
            )}
          </Button>
        )}
      </div>
    </PageTransition>
  );
}
