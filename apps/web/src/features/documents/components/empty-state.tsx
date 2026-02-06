import type { ReactNode } from 'react';

export type EmptyStateProps = {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
};

export function EmptyState({ title, description, action }: Readonly<EmptyStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-8 text-center">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
