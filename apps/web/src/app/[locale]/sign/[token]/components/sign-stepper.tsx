"use client";

import { Check, Eye, PenTool, FileCheck } from 'lucide-react';

export type SignStep = 'view' | 'fill' | 'review';

type SignStepperProps = Readonly<{
  currentStep: SignStep;
  labels: Readonly<{
    view: string;
    fill: string;
    review: string;
  }>;
}>;

const STEPS: ReadonlyArray<{ id: SignStep; icon: typeof Eye }> = [
  { id: 'view', icon: Eye },
  { id: 'fill', icon: PenTool },
  { id: 'review', icon: FileCheck },
];

const stepIndex = (step: SignStep): number =>
  STEPS.findIndex((s) => s.id === step);

export function SignStepper({ currentStep, labels }: SignStepperProps) {
  const activeIdx = stepIndex(currentStep);

  return (
    <div className="flex w-full items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < activeIdx;
        const isActive = idx === activeIdx;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all md:h-10 md:w-10 ${
                  isCompleted
                    ? 'border-success bg-success/20 text-success'
                    : isActive
                      ? 'border-accent-400 bg-accent-400/20 text-accent-400'
                      : 'border-white/20 bg-white/5 text-white/40'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide md:text-xs ${
                  isCompleted
                    ? 'text-success'
                    : isActive
                      ? 'text-accent-400'
                      : 'text-white/40'
                }`}
              >
                {labels[step.id]}
              </span>
            </div>

            {idx < STEPS.length - 1 ? (
              <div
                className={`mx-2 h-0.5 w-8 rounded-full md:mx-3 md:w-12 ${
                  idx < activeIdx ? 'bg-success' : 'bg-white/10'
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
