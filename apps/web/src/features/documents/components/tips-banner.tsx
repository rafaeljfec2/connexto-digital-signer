'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui';

export type TipsBannerProps = {
  readonly labels: Readonly<{
    dismiss: string;
    learnMore: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
  }>;
  readonly onLearnMore?: () => void;
};

export function TipsBanner({ labels, onLearnMore }: Readonly<TipsBannerProps>) {
  const [dismissed, setDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * 4));
  }, []);

  if (dismissed) return null;

  const tips = [labels.tip1, labels.tip2, labels.tip3, labels.tip4];
  const currentTip = tips[tipIndex];

  return (
    <Card
      variant="glass"
      className="relative overflow-hidden border-accent-600/20 p-5"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-600/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600/15">
              <Lightbulb className="h-4 w-4 text-accent-400" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400/70">
              Dica
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-foreground-subtle transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
          {currentTip}
        </p>

        {onLearnMore ? (
          <button
            type="button"
            onClick={onLearnMore}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-accent-400 transition-colors hover:text-accent-200"
          >
            {labels.learnMore}
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </Card>
  );
}
