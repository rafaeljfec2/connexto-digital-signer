"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PenTool, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from './badge';

export type SidebarItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly badge?: number;
};

export type SidebarGroup = {
  readonly label: string;
  readonly items: readonly SidebarItem[];
};

export type SidebarProps = {
  readonly groups: readonly SidebarGroup[];
  readonly title?: string;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly ctaLabel?: string;
  readonly ctaHref?: string;
};

export function Sidebar({
  groups,
  title,
  footer,
  className = '',
  ctaLabel,
  ctaHref,
}: Readonly<SidebarProps>) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full flex-col border-r border-th-border bg-th-sidebar ${className}`}
    >
      <div className="px-5 pb-2 pt-6">
        <Link href="/overview" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-cta shadow-lg shadow-accent-600/20">
            <PenTool className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <span className="text-base font-medium tracking-tight text-foreground">
              {title}
            </span>
            <span className="ml-1 text-[10px] font-medium uppercase tracking-widest text-accent-400">
              sign
            </span>
          </div>
        </Link>
      </div>

      {ctaLabel && ctaHref ? (
        <div className="px-4 pb-1 pt-4">
          <Link
            href={ctaHref}
            className="btn-primary-themed flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-normal transition-all"
          >
            <Plus className="h-4 w-4" />
            {ctaLabel}
          </Link>
        </div>
      ) : null}

      <nav className="mt-2 flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-normal uppercase tracking-[0.15em] text-foreground-subtle">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/overview'
                    ? pathname === item.href || pathname.endsWith('/overview')
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal transition-all ${
                      isActive
                        ? 'bg-th-active text-th-active-text shadow-sm'
                        : 'text-foreground-muted hover:bg-th-hover hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-accent-600/20 text-accent-400'
                          : 'bg-th-icon-bg text-th-icon-fg group-hover:bg-th-hover group-hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 ? (
                      <Badge variant="info" className="min-w-[20px] justify-center px-1.5 py-0 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {footer ? (
        <div className="border-t border-th-border px-4 py-4">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
