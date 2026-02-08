'use client';

import { Clock, CheckCircle2, AlertTriangle, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/shared/ui';

type KpiVariant = 'pending' | 'completed' | 'expired' | 'draft';

const VARIANT_CONFIG: Record<KpiVariant, {
  readonly icon: LucideIcon;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly valuePulse: string;
}> = {
  pending: {
    icon: Clock,
    iconBg: 'bg-accent-400/15',
    iconColor: 'text-accent-400',
    valuePulse: 'text-accent-400',
  },
  completed: {
    icon: CheckCircle2,
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    valuePulse: 'text-success',
  },
  expired: {
    icon: AlertTriangle,
    iconBg: 'bg-error/15',
    iconColor: 'text-error',
    valuePulse: 'text-error',
  },
  draft: {
    icon: FileEdit,
    iconBg: 'bg-white/10',
    iconColor: 'text-neutral-100/50',
    valuePulse: 'text-white',
  },
};

export type KpiItem = {
  readonly label: string;
  readonly value: number;
  readonly variant: KpiVariant;
  readonly href?: string;
};

export type KpiCardsProps = {
  readonly items: readonly KpiItem[];
  readonly isLoading?: boolean;
  readonly onCardClick?: (variant: KpiVariant) => void;
};

export function KpiCards({ items, isLoading = false, onCardClick }: Readonly<KpiCardsProps>) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const config = VARIANT_CONFIG[item.variant];
        const Icon = config.icon;

        return (
          <Card
            key={item.variant}
            variant="glass"
            className={`group p-4 transition-all ${onCardClick ? 'cursor-pointer hover:border-white/20 hover:bg-white/[0.06]' : ''}`}
            onClick={onCardClick ? () => onCardClick(item.variant) : undefined}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-100/50">
                  {item.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-16" />
                ) : (
                  <p className={`mt-2 text-2xl font-bold ${item.value > 0 ? config.valuePulse : 'text-white/40'}`}>
                    {item.value}
                  </p>
                )}
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
