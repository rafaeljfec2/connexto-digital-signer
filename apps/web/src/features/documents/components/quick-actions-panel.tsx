'use client';

import { Send, FileText, PenTool } from 'lucide-react';
import { Card } from '@/shared/ui';

export type QuickActionsPanelProps = {
  readonly labels: Readonly<{
    title: string;
    sendDocument: string;
    viewAll: string;
    signTitle: string;
    signDescription: string;
  }>;
  readonly onSendDocument: () => void;
  readonly onViewAll: () => void;
};

export function QuickActionsPanel({
  labels,
  onSendDocument,
  onViewAll,
}: Readonly<QuickActionsPanelProps>) {
  return (
    <div className="space-y-3">
      <Card variant="glass" className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-white">{labels.title}</h3>
        </div>

        <button
          type="button"
          onClick={onSendDocument}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-cta px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/25 transition-all hover:shadow-brand-900/40 hover:brightness-110"
        >
          <Send className="h-4 w-4" />
          {labels.sendDocument}
        </button>

        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-100/70 transition-all hover:bg-white/10 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          {labels.viewAll}
        </button>
      </Card>

      <Card variant="glass" className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600/15">
            <PenTool className="h-5 w-5 text-accent-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">{labels.signTitle}</h3>
            <p className="text-xs text-neutral-100/40">{labels.signDescription}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
