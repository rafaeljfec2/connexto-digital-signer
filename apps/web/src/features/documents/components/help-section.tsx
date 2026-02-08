'use client';

import { HelpCircle, MessageSquare, BookOpen, ExternalLink } from 'lucide-react';
import { Card } from '@/shared/ui';

export type HelpSectionProps = {
  readonly labels: Readonly<{
    title: string;
    faq: string;
    support: string;
    docs: string;
  }>;
};

const HELP_ITEMS = [
  { key: 'faq' as const, icon: HelpCircle },
  { key: 'support' as const, icon: MessageSquare },
  { key: 'docs' as const, icon: BookOpen },
];

export function HelpSection({ labels }: Readonly<HelpSectionProps>) {
  return (
    <Card variant="glass" className="p-5">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-accent-400" />
        <h3 className="text-sm font-medium text-foreground">{labels.title}</h3>
      </div>

      <div className="mt-3 space-y-1">
        {HELP_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-th-hover"
            >
              <Icon className="h-4 w-4 shrink-0 text-foreground-subtle transition-colors group-hover:text-accent-400" />
              <span className="flex-1 text-sm text-foreground-muted transition-colors group-hover:text-foreground">
                {labels[item.key]}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-foreground-subtle transition-colors group-hover:text-foreground-muted" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
