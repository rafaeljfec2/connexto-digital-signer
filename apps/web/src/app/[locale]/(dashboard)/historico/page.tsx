'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { History, Search } from 'lucide-react';
import { Input } from '@/shared/ui';
import { PageTransition } from '@/shared/animations';

export default function HistoricoPage() {
  const t = useTranslations('historico');
  const [documentFilter, setDocumentFilter] = useState('');

  return (
    <PageTransition>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium text-foreground">{t('title')}</h1>
          <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
            placeholder={t('filterPlaceholder')}
            className="pl-10"
            aria-label={t('filterLabel')}
          />
        </div>

        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl px-4 py-16 text-center">
          <History className="h-10 w-10 text-foreground-subtle" />
          <p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p>
          <p className="max-w-sm text-xs text-foreground-muted">{t('emptyDescription')}</p>
        </div>
      </div>
    </PageTransition>
  );
}
