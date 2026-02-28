"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  Home,
  FileText,
  Folder,
  PenTool,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  X,
  LayoutTemplate,
  Users,
  Code2,
  Key,
  Webhook,
  Activity,
  BookOpen,
  History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Button, Sidebar, ThemeToggle } from '@/shared/ui';
import type { SidebarGroup } from '@/shared/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  documents: FileText,
  folders: Folder,
  templates: LayoutTemplate,
  signDocuments: PenTool,
  historico: History,
  signers: Users,
  settings: Settings,
  developers: Code2,
  apiKeys: Key,
  webhooks: Webhook,
  apiLogs: Activity,
  apiDocs: BookOpen,
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
  const tenantDisplayName = isMounted ? (user?.tenantName ?? tenantLabel) : tenantLabel;
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
        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
        <p className="truncate text-[10px] text-foreground-subtle">{tenantDisplayName}</p>
      </div>
    </div>
  ), [initials, displayName, tenantDisplayName]);

  return (
    <div className="h-screen text-foreground">
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

        <AnimatePresence>
          {sidebarOpen ? (
            <div className="fixed inset-0 z-40 flex lg:hidden">
              <motion.div
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="h-full w-72 bg-th-dialog backdrop-blur-xl"
              >
                <Sidebar
                  groups={sidebarGroups}
                  title={appName}
                  ctaLabel={ctaLabel}
                  ctaHref={ctaHref}
                  footer={sidebarFooter}
                />
              </motion.div>
              <motion.button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex-1 bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 flex shrink-0 items-center gap-3 border-b border-th-header-border bg-th-header px-3 py-2.5 sm:px-5">
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 border-0 p-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <form
              className="relative hidden sm:block sm:max-w-md sm:flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input');
                const value = input?.value.trim() ?? '';
                if (value) {
                  router.push(`/documents?search=${encodeURIComponent(value)}`);
                  input?.blur();
                } else {
                  router.push('/documents');
                }
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-xl border border-th-border bg-th-input pl-9 pr-4 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </form>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5">
              <ThemeToggle />

              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl text-foreground-muted transition-colors hover:bg-th-hover hover:text-foreground"
                >
                  <Bell className="h-4.5 w-4.5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                </button>

                {notifOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-th-card-border bg-th-dialog shadow-2xl">
                    <div className="flex items-center justify-between border-b border-th-border px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {notificationsLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-foreground-subtle hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <Bell className="h-8 w-8 text-foreground-subtle" />
                      <p className="text-xs text-foreground-subtle">
                        {noNotificationsLabel}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden h-6 w-px bg-th-border sm:block" />

              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{displayName}</p>
                  <p className="text-[10px] text-foreground-subtle">{tenantDisplayName}</p>
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
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-th-card-border bg-th-dialog shadow-2xl">
                    <div className="border-b border-th-border px-4 py-3">
                      <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                      <p className="truncate text-xs text-foreground-subtle">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          router.push('/settings');
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-muted transition-colors hover:bg-th-hover hover:text-foreground"
                      >
                        <User className="h-4 w-4" />
                        {myAccountLabel}
                      </button>
                    </div>
                    <div className="border-t border-th-border">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-th-hover"
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
