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

        let circleClass = 'border-white/20 bg-white/5 text-white/40';
        let labelClass = 'text-white/40';
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
                className={`text-[9px] font-semibold tracking-wide md:text-[10px] ${labelClass}`}
              >
                {labels[step.id]}
              </span>
            </div>

            {idx < STEPS.length - 1 ? (
              <div
                className={`mx-1.5 h-0.5 w-6 rounded-full md:mx-2 md:w-10 ${
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
