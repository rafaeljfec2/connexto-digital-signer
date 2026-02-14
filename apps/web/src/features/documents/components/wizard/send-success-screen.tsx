"use client";

import { useTranslations } from 'next-intl';
import { CheckCircle2, FileText, Activity } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button, Card } from '@/shared/ui';
import { FadeIn } from '@/shared/animations';

type SendSuccessScreenProps = {
  readonly envelopeId: string;
  readonly onTrack: () => void;
};

export function SendSuccessScreen({ envelopeId: _envelopeId, onTrack }: SendSuccessScreenProps) {
  const t = useTranslations('review.success');

  return (
    <FadeIn className="w-full">
      <Card variant="glass" className="w-full p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground md:text-2xl">
              {t('title')}
            </h2>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-foreground-muted">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-xs flex-col gap-3">
          <Button type="button" onClick={onTrack} className="w-full">
            <Activity className="mr-1.5 h-4 w-4" />
            {t('trackSignature')}
          </Button>
          <Link href="/documents/new" className="w-full">
            <Button type="button" variant="secondary" className="w-full">
              <FileText className="mr-1.5 h-4 w-4" />
              {t('newDocument')}
            </Button>
          </Link>
        </div>
      </Card>
    </FadeIn>
  );
}
