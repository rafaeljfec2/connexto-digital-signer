'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, X, Sparkles } from 'lucide-react';
import { Card } from '@/shared/ui';

type OnboardingStep = {
  readonly id: string;
  readonly label: string;
  readonly completed: boolean;
};

export type OnboardingChecklistProps = {
  readonly labels: Readonly<{
    title: string;
    progress: string;
    dismiss: string;
    createAccount: string;
    sendFirstDocument: string;
    addSigners: string;
    completeFirstSignature: string;
  }>;
  readonly stats: Readonly<{
    draft: number;
    pending: number;
    completed: number;
  }>;
};

const STORAGE_KEY = 'connexto_onboarding_dismissed';

export function OnboardingChecklist({
  labels,
  stats,
}: Readonly<OnboardingChecklistProps>) {
  const [dismissed, setDismissed] = useState(() => {
    if (globalThis.window === undefined) return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  if (dismissed) return null;

  const steps: OnboardingStep[] = [
    { id: 'account', label: labels.createAccount, completed: true },
    { id: 'send', label: labels.sendFirstDocument, completed: stats.draft > 0 || stats.pending > 0 || stats.completed > 0 },
    { id: 'signers', label: labels.addSigners, completed: stats.pending > 0 || stats.completed > 0 },
    { id: 'complete', label: labels.completeFirstSignature, completed: stats.completed > 0 },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const progressLabel = labels.progress
    .replace('{completed}', String(completedCount))
    .replace('{total}', String(steps.length));

  return (
    <Card variant="glass" className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{labels.title}</h3>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-foreground-subtle transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-foreground-subtle">{progressLabel}</p>
          <p className="text-[11px] font-medium text-primary">{Math.round(progressPct)}%</p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-th-hover">
          <div
            className="h-full rounded-full bg-gradient-cta transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {step.completed ? (
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" />
            ) : (
              <Circle className="h-4.5 w-4.5 shrink-0 text-foreground-subtle" />
            )}
            <span
              className={`text-sm ${
                step.completed
                  ? 'text-foreground-subtle line-through'
                  : 'font-medium text-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
