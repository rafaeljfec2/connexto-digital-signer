"use client";

import { Check, Eye, PenTool, ShieldCheck, FileCheck, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

export type SignStep = 'identify' | 'view' | 'fill' | 'validate' | 'review';

type StepDefinition = Readonly<{
  id: SignStep;
  icon: LucideIcon;
}>;

type SignStepperProps = Readonly<{
  currentStep: SignStep;
  showValidation: boolean;
  showIdentify: boolean;
  labels: Readonly<{
    identify: string;
    view: string;
    fill: string;
    validate: string;
    review: string;
  }>;
}>;

const ALL_STEPS: readonly StepDefinition[] = [
  { id: 'identify', icon: UserCheck },
  { id: 'view', icon: Eye },
  { id: 'fill', icon: PenTool },
  { id: 'validate', icon: ShieldCheck },
  { id: 'review', icon: FileCheck },
];

export function SignStepper({ currentStep, showValidation, showIdentify, labels }: SignStepperProps) {
  const steps = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (s.id === 'validate' && !showValidation) return false;
      if (s.id === 'identify' && !showIdentify) return false;
      return true;
    });
  }, [showValidation, showIdentify]);

  const activeIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex w-full items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        const Icon = step.icon;

        const isHighlighted = isCompleted || isActive;
        const circleClass = isHighlighted
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-th-border bg-th-hover text-foreground-subtle';
        const labelClass = isHighlighted ? 'text-primary' : 'text-foreground-subtle';

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all md:h-9 md:w-9 ${circleClass}`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide md:text-xs ${labelClass}`}
              >
                {labels[step.id]}
              </span>
            </div>

            {idx < steps.length - 1 ? (
              <div
                className={`mx-2 h-0.5 w-8 rounded-full md:mx-3 md:w-12 ${
                  idx < activeIdx ? 'bg-primary' : 'bg-th-border'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
