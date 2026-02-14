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
  readonly onSignDocuments?: () => void;
};

export function QuickActionsPanel({
  labels,
  onSendDocument,
  onViewAll,
  onSignDocuments,
}: Readonly<QuickActionsPanelProps>) {
  return (
    <div className="space-y-3">
      <Card variant="glass" className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">{labels.title}</h3>
        </div>

        <button
          type="button"
          onClick={onSendDocument}
          className="btn-primary-themed flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-normal transition-all"
        >
          <Send className="h-4 w-4" />
          {labels.sendDocument}
        </button>

        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-th-border bg-th-hover px-4 py-2.5 text-sm font-normal text-foreground-muted transition-all hover:bg-th-active hover:text-foreground"
        >
          <FileText className="h-4 w-4" />
          {labels.viewAll}
        </button>
      </Card>

      <Card
        variant="glass"
        className="cursor-pointer p-5 transition-colors hover:bg-th-hover"
        onClick={onSignDocuments}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <PenTool className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-foreground">{labels.signTitle}</h3>
            <p className="text-xs text-foreground-subtle">{labels.signDescription}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
