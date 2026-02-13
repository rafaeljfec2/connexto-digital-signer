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
      signOutLabel={tCommon('signOut')}
      searchPlaceholder={tCommon('searchPlaceholder')}
      notificationsLabel={tCommon('notificationsLabel')}
      noNotificationsLabel={tCommon('noNotifications')}
      myAccountLabel={tCommon('myAccount')}
      ctaLabel={tCommon('newDocument')}
      ctaHref="/documents/new"
      navGroupLabels={{
        main: tCommon('navGroups.main'),
        management: tCommon('navGroups.management'),
      }}
      navItems={[
        { id: 'home', label: tCommon('nav.home'), href: '/overview', iconKey: 'home', group: 'main' },
        { id: 'documents', label: tCommon('nav.documents'), href: '/documents', iconKey: 'documents', group: 'main' },
        { id: 'folders', label: tCommon('nav.folders'), href: '/folders', iconKey: 'folders', group: 'main' },
        { id: 'signers', label: tCommon('nav.signers'), href: '/signers', iconKey: 'signers', group: 'management' },
        { id: 'settings', label: tCommon('nav.settings'), href: '/settings', iconKey: 'settings', group: 'management' },
      ]}
    >
      {children}
    </AppShell>
  );
}
