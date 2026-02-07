import type { ReactNode } from 'react';

export type StepperItem = {
  readonly label: string;
  readonly status: 'pending' | 'active' | 'completed';
  readonly icon?: ReactNode;
};

export type StepperProps = {
  readonly steps: StepperItem[];
  readonly progressLabel?: string;
  readonly counterLabel?: string;
};

export function Stepper({ steps, progressLabel, counterLabel }: Readonly<StepperProps>) {
  const activeIndex = steps.findIndex((s) => s.status === 'active');
  const currentIndex = activeIndex >= 0 ? activeIndex : steps.length;
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="glass-card space-y-5 rounded-2xl p-5">
      {progressLabel ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-white">{progressLabel}</span>
            {counterLabel ? (
              <span className="text-neutral-100/70">{counterLabel}</span>
            ) : null}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';

          let circleClass: string;
          if (isCompleted) {
            circleClass = 'bg-success/20 text-success border-success/30';
          } else if (isActive) {
            circleClass = 'bg-accent-600/20 text-accent-400 border-accent-400/40';
          } else {
            circleClass = 'bg-white/10 text-neutral-100/50 border-white/15';
          }

          let labelClass: string;
          if (isActive) {
            labelClass = 'text-white font-semibold';
          } else if (isCompleted) {
            labelClass = 'text-success/80 font-medium';
          } else {
            labelClass = 'text-neutral-100/50 font-medium';
          }

          return (
            <div
              key={`step-${step.label}-${index}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors duration-300 ${circleClass}`}
              >
                {step.icon ?? (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <span className={`text-center text-xs leading-tight ${labelClass}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
