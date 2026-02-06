import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const tCommon = await getTranslations('common');

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-lg font-semibold text-text">{tCommon('appName')}</div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted">{tCommon('tenantLabel')}</div>
            <div className="h-8 w-8 rounded-full bg-accent" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
