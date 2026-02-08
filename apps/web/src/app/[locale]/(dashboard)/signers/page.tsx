"use client";

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui';
import { EmptyState } from '@/features/documents/components/empty-state';

export default function SignersManagementPage() {
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium text-foreground">{tCommon('signersTitle')}</h1>
        <p className="text-sm text-foreground-muted">{tCommon('signersSubtitle')}</p>
      </div>
      <Card variant="glass" className="p-6">
        <EmptyState
          title={tCommon('signersEmptyTitle')}
          description={tCommon('signersEmptyDescription')}
        />
      </Card>
    </div>
  );
}
