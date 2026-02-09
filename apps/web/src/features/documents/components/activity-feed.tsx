'use client';

import { Card, Skeleton } from '@/shared/ui';
import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import type { DocumentSummary } from '../api';

type ActivityType = 'sent' | 'completed' | 'expired';

type ActivityItem = {
  readonly id: string;
  readonly type: ActivityType;
  readonly message: string;
  readonly date: string;
};

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    readonly icon: LucideIcon;
    readonly dotColor: string;
    readonly iconColor: string;
  }
> = {
  sent: { icon: Send, dotColor: 'bg-accent-400', iconColor: 'text-accent-400' },
  completed: { icon: CheckCircle2, dotColor: 'bg-success', iconColor: 'text-success' },
  expired: { icon: AlertTriangle, dotColor: 'bg-error', iconColor: 'text-error' },
};

export type ActivityFeedProps = {
  readonly labels: Readonly<{
    title: string;
    empty: string;
    sentForSignature: (title: string) => string;
    documentCompleted: (title: string) => string;
    documentExpired: (title: string) => string;
  }>;
  readonly documents: readonly DocumentSummary[];
  readonly isLoading?: boolean;
  readonly formatRelativeDate: (date: string) => string;
};

function deriveActivities(
  documents: readonly DocumentSummary[],
  labels: ActivityFeedProps['labels']
): ActivityItem[] {
  const activities: ActivityItem[] = [];

  for (const doc of documents) {
    if (doc.status === 'pending_signatures') {
      activities.push({
        id: `${doc.id}-sent`,
        type: 'sent',
        message: labels.sentForSignature(doc.title),
        date: doc.createdAt,
      });
    }
    if (doc.status === 'completed') {
      activities.push({
        id: `${doc.id}-completed`,
        type: 'completed',
        message: labels.documentCompleted(doc.title),
        date: doc.createdAt,
      });
    }
    if (doc.status === 'expired') {
      activities.push({
        id: `${doc.id}-expired`,
        type: 'expired',
        message: labels.documentExpired(doc.title),
        date: doc.createdAt,
      });
    }
  }

  return activities.slice(0, 5);
}

export function ActivityFeed({
  labels,
  documents,
  isLoading = false,
  formatRelativeDate,
}: Readonly<ActivityFeedProps>) {
  const activities = deriveActivities(documents, labels);

  return (
    <Card variant="glass" className="p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent-400" />
        <h3 className="text-sm font-medium text-foreground">{labels.title}</h3>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={`skel-${String(i)}`} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && activities.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-4 text-center">
          <Activity className="h-8 w-8 text-foreground-subtle" />
          <p className="text-xs text-foreground-subtle">{labels.empty}</p>
        </div>
      ) : null}

      {!isLoading && activities.length > 0 ? (
        <div className="relative mt-4 space-y-0">
          <div className="absolute left-[7px] top-2 h-[calc(100%-16px)] w-px bg-th-border" />
          {activities.map((item) => {
            const config = ACTIVITY_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <div key={item.id} className="relative flex items-start gap-3 py-2">
                <div
                  className={`relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${config.dotColor}`}
                >
                  <Icon className="h-2 w-2 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-tight text-foreground-muted">{item.message}</p>
                  <p className="mt-0.5 text-[10px] text-foreground-subtle">
                    {formatRelativeDate(item.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
