import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export type EmptyStateProps = {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: Readonly<EmptyStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        {icon ?? <Inbox className="h-7 w-7 text-neutral-100/20" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description ? (
          <p className="max-w-xs text-xs leading-relaxed text-neutral-100/40">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
