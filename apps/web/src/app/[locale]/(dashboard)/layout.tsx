import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/shared/layouts/app-shell';

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const tCommon = await getTranslations('common');

  return (
    <AppShell
      appName={tCommon('appName')}
      tenantLabel={tCommon('tenantLabel')}
      helpLabel={tCommon('help')}
      navItems={[
        { id: 'home', label: tCommon('nav.home'), href: '/', iconKey: 'home' },
        { id: 'documents', label: tCommon('nav.documents'), href: '/documents', iconKey: 'documents' },
        { id: 'signers', label: tCommon('nav.signers'), href: '/signers', iconKey: 'signers' },
        { id: 'settings', label: tCommon('nav.settings'), href: '/settings', iconKey: 'settings' },
      ]}
    >
      {children}
    </AppShell>
  );
}
