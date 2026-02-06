export type StepperItem = {
  readonly label: string;
  readonly status: 'pending' | 'active' | 'completed';
};

export type StepperProps = {
  readonly steps: StepperItem[];
};

export function Stepper({ steps }: Readonly<StepperProps>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';
        const base =
          'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium';
        const stateClass = isCompleted
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : isActive
          ? 'border-accent bg-accent/10 text-text'
          : 'border-border bg-surface text-muted';
        return (
          <div key={`${step.label}-${index}`} className={`${base} ${stateClass}`}>
            <span>{index + 1}</span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
