"use client";

import { Check, Eye, PenTool, ShieldCheck, FileCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

export type SignStep = 'view' | 'fill' | 'validate' | 'review';

type StepDefinition = Readonly<{
  id: SignStep;
  icon: LucideIcon;
}>;

type SignStepperProps = Readonly<{
  currentStep: SignStep;
  showValidation: boolean;
  labels: Readonly<{
    view: string;
    fill: string;
    validate: string;
    review: string;
  }>;
}>;

const ALL_STEPS: readonly StepDefinition[] = [
  { id: 'view', icon: Eye },
  { id: 'fill', icon: PenTool },
  { id: 'validate', icon: ShieldCheck },
  { id: 'review', icon: FileCheck },
];

export function SignStepper({ currentStep, showValidation, labels }: SignStepperProps) {
  const steps = useMemo(() => {
    if (showValidation) return ALL_STEPS;
    return ALL_STEPS.filter((s) => s.id !== 'validate');
  }, [showValidation]);

  const activeIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex w-full items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        const Icon = step.icon;

        let circleClass = 'border-th-border bg-th-hover text-foreground-subtle';
        let labelClass = 'text-foreground-subtle';
        if (isCompleted) {
          circleClass = 'border-success bg-success/20 text-success';
          labelClass = 'text-success';
        } else if (isActive) {
          circleClass = 'border-accent-400 bg-accent-400/20 text-accent-400';
          labelClass = 'text-accent-400';
        }

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all md:h-8 md:w-8 ${circleClass}`}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 md:h-3.5 md:w-3.5" />
                ) : (
                  <Icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                )}
              </div>
              <span
                className={`text-[9px] font-normal tracking-wide md:text-[10px] ${labelClass}`}
              >
                {labels[step.id]}
              </span>
            </div>

            {idx < steps.length - 1 ? (
              <div
                className={`mx-1.5 h-0.5 w-6 rounded-full md:mx-2 md:w-10 ${
                  idx < activeIdx ? 'bg-success' : 'bg-th-border'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
