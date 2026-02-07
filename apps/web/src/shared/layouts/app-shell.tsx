"use client";

import { useEffect, useMemo, useState } from 'react';
import { Menu, HelpCircle, Home, FileText, Users, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Button, Sidebar } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  documents: FileText,
  signers: Users,
  settings: Settings,
};

export type AppShellNavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly iconKey: string;
};

export type AppShellProps = {
  readonly children: React.ReactNode;
  readonly navItems: AppShellNavItem[];
  readonly title?: string;
  readonly helpLabel: string;
  readonly appName: string;
  readonly tenantLabel: string;
};

export function AppShell({
  children,
  navItems,
  title,
  helpLabel,
  appName,
  tenantLabel,
}: Readonly<AppShellProps>) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayName = isMounted ? (user?.name ?? appName) : appName;
  const initials = isMounted ? (user?.name ?? tenantLabel) : tenantLabel;

  const sidebarItems = useMemo(
    () =>
      navItems.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: ICON_MAP[item.iconKey] ?? Home,
      })),
    [navItems]
  );

  return (
    <div className="min-h-screen text-white">
      <div className="flex">
        <div className="hidden h-screen w-64 lg:block">
          <Sidebar items={sidebarItems} title={appName} />
        </div>
        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="h-full w-72 bg-brand-900/90">
              <Sidebar items={sidebarItems} title={appName} />
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 bg-black/60"
            />
          </div>
        ) : null}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 p-0 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-100/70">
                  {appName}
                </div>
                <div className="text-lg font-semibold text-white">{title ?? tenantLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" className="hidden sm:inline-flex">
                <HelpCircle className="h-4 w-4" />
                {helpLabel}
              </Button>
              <div className="hidden sm:block text-right text-xs text-neutral-100/70">
                <div>{tenantLabel}</div>
                <div className="text-sm font-semibold text-white">{displayName}</div>
              </div>
              <Avatar name={initials} size="md" statusColor="#14B8A6" />
            </div>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
