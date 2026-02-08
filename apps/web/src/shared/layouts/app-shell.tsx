"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Button, Sidebar } from '@/shared/ui';
import type { SidebarGroup } from '@/shared/ui';
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
  readonly badge?: number;
  readonly group?: string;
};

export type AppShellProps = {
  readonly children: React.ReactNode;
  readonly navItems: AppShellNavItem[];
  readonly title?: string;
  readonly helpLabel: string;
  readonly appName: string;
  readonly tenantLabel: string;
  readonly signOutLabel: string;
  readonly searchPlaceholder?: string;
  readonly notificationsLabel?: string;
  readonly noNotificationsLabel?: string;
  readonly myAccountLabel?: string;
  readonly ctaLabel?: string;
  readonly ctaHref?: string;
  readonly navGroupLabels?: Record<string, string>;
};

export function AppShell({
  children,
  navItems,
  helpLabel: _helpLabel,
  appName,
  tenantLabel,
  signOutLabel,
  searchPlaceholder,
  notificationsLabel,
  noNotificationsLabel,
  myAccountLabel,
  ctaLabel,
  ctaHref,
  navGroupLabels = {},
}: Readonly<AppShellProps>) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await logout();
    router.push('/');
  };

  const displayName = isMounted ? (user?.name ?? appName) : appName;
  const initials = isMounted ? (user?.name ?? tenantLabel) : tenantLabel;

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    const groupMap = new Map<string, AppShellNavItem[]>();

    for (const item of navItems) {
      const groupKey = item.group ?? 'main';
      const existing = groupMap.get(groupKey) ?? [];
      existing.push(item);
      groupMap.set(groupKey, existing);
    }

    return Array.from(groupMap.entries()).map(([key, items]) => ({
      label: navGroupLabels[key] ?? key,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: ICON_MAP[item.iconKey] ?? Home,
        badge: item.badge,
      })),
    }));
  }, [navItems, navGroupLabels]);

  const sidebarFooter = useMemo(() => (
    <div className="flex items-center gap-3">
      <Avatar name={initials} size="sm" statusColor="#14B8A6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{displayName}</p>
        <p className="truncate text-[10px] text-neutral-100/40">{tenantLabel}</p>
      </div>
    </div>
  ), [initials, displayName, tenantLabel]);

  return (
    <div className="h-screen text-white">
      <div className="flex h-full">
        <div className="hidden h-full w-64 shrink-0 lg:block">
          <Sidebar
            groups={sidebarGroups}
            title={appName}
            ctaLabel={ctaLabel}
            ctaHref={ctaHref}
            footer={sidebarFooter}
          />
        </div>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="h-full w-72 bg-brand-900/95 backdrop-blur-xl">
              <Sidebar
                groups={sidebarGroups}
                title={appName}
                ctaLabel={ctaLabel}
                ctaHref={ctaHref}
                footer={sidebarFooter}
              />
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 bg-black/60"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 flex shrink-0 items-center gap-3 border-b border-white/8 bg-white/[0.03] px-3 py-2.5 backdrop-blur-xl sm:px-5">
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 border-0 p-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="relative hidden sm:block sm:max-w-md sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-100/30" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-neutral-100/30 focus:border-accent-400/40 focus:outline-none focus:ring-1 focus:ring-accent-400/20"
                onFocus={() => router.push('/documents')}
                readOnly
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5">
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl text-neutral-100/50 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <Bell className="h-4.5 w-4.5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-400" />
                </button>

                {notifOpen ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
                    style={{ backgroundColor: '#0b1f3b' }}
                  >
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                      <p className="text-sm font-semibold text-white">
                        {notificationsLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-neutral-100/40 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-neutral-100/20" />
                      <p className="text-xs text-neutral-100/40">
                        {noNotificationsLabel}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden h-6 w-px bg-white/10 sm:block" />

              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white">{displayName}</p>
                  <p className="text-[10px] text-neutral-100/40">{tenantLabel}</p>
                </div>
              </div>

              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="rounded-full transition-opacity hover:opacity-80"
                >
                  <Avatar name={initials} size="md" statusColor="#14B8A6" />
                </button>
                {profileOpen ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
                    style={{ backgroundColor: '#0b1f3b' }}
                  >
                    <div className="border-b border-white/8 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-white/40">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          router.push('/settings');
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-100/70 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <User className="h-4 w-4" />
                        {myAccountLabel}
                      </button>
                    </div>
                    <div className="border-t border-white/8">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-white/5"
                      >
                        <LogOut className="h-4 w-4" />
                        {signOutLabel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
