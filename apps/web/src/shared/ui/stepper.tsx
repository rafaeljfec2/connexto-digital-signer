export type StepperItem = {
  readonly label: string;
  readonly status: 'pending' | 'active' | 'completed';
};

export type StepperProps = {
  readonly steps: StepperItem[];
};

export function Stepper({ steps }: Readonly<StepperProps>) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';
        let circleClass = 'bg-white/10 text-neutral-100/60 border-white/20';
        if (isCompleted) {
          circleClass = 'bg-success/20 text-success border-success/30';
        } else if (isActive) {
          circleClass = 'bg-white/20 text-white border-white/40';
        }
        const labelClass = isActive ? 'text-white' : 'text-neutral-100/70';
        return (
          <div key={`${step.label}-${index}`} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${circleClass}`}
            >
              {index + 1}
            </div>
            <span className={`text-sm font-semibold ${labelClass}`}>{step.label}</span>
            {index < steps.length - 1 ? (
              <div className="hidden h-px w-10 bg-white/20 sm:block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
