"use client";

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui';
import { EmptyState } from '@/features/documents/components/empty-state';

export default function SettingsPage() {
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">{tCommon('settingsTitle')}</h1>
        <p className="text-sm text-neutral-100/70">{tCommon('settingsSubtitle')}</p>
      </div>
      <Card variant="glass" className="p-6">
        <EmptyState
          title={tCommon('settingsEmptyTitle')}
          description={tCommon('settingsEmptyDescription')}
        />
      </Card>
    </div>
  );
}
