"use client";

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, Card } from '@/shared/ui';

export default function SuccessPage() {
  const tSuccess = useTranslations('success');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-main px-4 py-12 text-white">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <Card variant="glass" className="w-full space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{tSuccess('title')}</h1>
            <p className="text-sm text-neutral-100/70">{tSuccess('subtitle')}</p>
          </div>
          <div className="flex justify-center">
            <Button type="button" onClick={() => router.push('/')}>
              {tSuccess('cta')}
            </Button>
          </div>
          <div className="pt-2 text-xs text-neutral-100/60">{tSuccess('badge')}</div>
        </Card>
      </div>
    </div>
  );
}
