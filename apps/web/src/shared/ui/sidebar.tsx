"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export type SidebarItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
};

export type SidebarProps = {
  readonly items: SidebarItem[];
  readonly title?: string;
  readonly footer?: ReactNode;
  readonly className?: string;
};

export function Sidebar({
  items,
  title,
  footer,
  className = '',
}: Readonly<SidebarProps>) {
  const pathname = usePathname();

  return (
    <aside
      className={`glass-surface flex h-full flex-col border-r border-white/10 px-4 py-6 ${className}`}
    >
      {title ? (
        <div className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-100/70">
          {title}
        </div>
      ) : null}
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-neutral-100/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {footer ? <div className="pt-4">{footer}</div> : null}
    </aside>
  );
}
