"use client";

import { useTranslations } from 'next-intl';
import { Send, Eye, UserCheck, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { useEnvelopeTracking } from '../hooks/use-envelope-tracking';
import type { TrackingStep, TrackingSigner } from '../api';

type SignerTrackingPanelProps = Readonly<{
  envelopeId: string;
}>;

type StepStatus = 'completed' | 'active' | 'pending';

const STEP_ICONS: Record<TrackingStep['key'], typeof Send> = {
  notified: Send,
  viewed: Eye,
  verified: UserCheck,
  signed: CheckCircle,
};

function getStepStatus(
  step: TrackingStep,
  index: number,
  steps: ReadonlyArray<TrackingStep>,
): StepStatus {
  if (step.completedAt !== null) return 'completed';

  const previousCompleted = index === 0 || steps[index - 1]?.completedAt !== null;
  if (previousCompleted) return 'active';

  return 'pending';
}

function formatTimestamp(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StepLine({ status }: Readonly<{ status: StepStatus }>) {
  let colorClass: string;
  if (status === 'completed') {
    colorClass = 'bg-success/40';
  } else {
    colorClass = 'bg-th-border';
  }

  return <div className={`absolute left-4 top-9 h-[calc(100%-28px)] w-0.5 ${colorClass}`} />;
}

function TrackingStepItem({
  step,
  status,
  locale,
}: Readonly<{
  step: TrackingStep;
  status: StepStatus;
  locale: string;
}>) {
  const t = useTranslations('tracking');
  const Icon = STEP_ICONS[step.key];

  let circleClass: string;
  if (status === 'completed') {
    circleClass = 'bg-success/20 text-success border-success/30';
  } else if (status === 'active') {
    circleClass = 'bg-primary/20 text-primary border-primary/40';
  } else {
    circleClass = 'bg-th-hover text-foreground-subtle border-th-border';
  }

  let labelClass: string;
  if (status === 'completed') {
    labelClass = 'text-success';
  } else if (status === 'active') {
    labelClass = 'text-foreground font-medium';
  } else {
    labelClass = 'text-foreground-subtle';
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${circleClass}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${labelClass}`}>
            {t(`steps.${step.key}`)}
          </span>
          {step.key === 'notified' && step.reminderCount !== undefined && step.reminderCount > 0 ? (
            <Badge variant="info" className="text-[10px]">
              {step.reminderCount} {t('reminders')}
            </Badge>
          ) : null}
        </div>
        {step.completedAt === null ? null : (
          <span className="text-xs text-foreground-muted">
            {formatTimestamp(step.completedAt, locale)}
          </span>
        )}
        {status === 'active' ? (
          <span className="text-xs text-primary">{t('waiting')}</span>
        ) : null}
      </div>
    </div>
  );
}

function SignerCard({
  signer,
  locale,
}: Readonly<{
  signer: TrackingSigner;
  locale: string;
}>) {
  const t = useTranslations('tracking');
  const badgeVariant = signer.status === 'signed' ? 'success' : 'warning';

  return (
    <div className="rounded-xl border border-th-card-border bg-th-card p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {signer.name}
          </p>
          <p className="truncate text-xs text-foreground-muted">
            {signer.email}
          </p>
        </div>
        <Badge variant={badgeVariant}>
          {t(`signerStatus.${signer.status}`)}
        </Badge>
      </div>

      <div className="space-y-0">
        {signer.steps.map((step, index) => {
          const status = getStepStatus(step, index, signer.steps);
          const isLast = index === signer.steps.length - 1;

          return (
            <div
              key={step.key}
              className={`relative ${isLast ? '' : 'pb-4'}`}
            >
              {isLast ? null : <StepLine status={status} />}
              <TrackingStepItem step={step} status={status} locale={locale} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={`skeleton-${String(i)}`} className="rounded-xl border border-th-card-border p-4">
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={`step-skeleton-${String(j)}`} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SignerTrackingPanel({ envelopeId }: SignerTrackingPanelProps) {
  const t = useTranslations('tracking');
  const { data, isLoading, isError } = useEnvelopeTracking(envelopeId);

  if (isLoading) return <PanelSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-foreground-muted">
        {t('errorLoading')}
      </div>
    );
  }

  const locale = 'pt-BR';
  const signerCount = data.signers.length;
  const signedCount = data.signers.filter((s) => s.status === 'signed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-th-hover/50 px-3 py-2">
        <span className="text-sm text-foreground-muted">{t('progress')}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {signedCount}/{signerCount}
          </span>
          {signedCount < signerCount ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          )}
        </div>
      </div>

      {data.signers.map((signer) => (
        <SignerCard key={signer.id} signer={signer} locale={locale} />
      ))}
    </div>
  );
}
