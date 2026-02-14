'use client';

import { FadeIn } from '@/shared/animations';
import { ThemeToggle } from '@/shared/ui/theme-toggle';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

function BrandingPanel() {
  const t = useTranslations('landing.hero');

  return (
    <>
      <div className="flex flex-col items-center gap-3 lg:items-start">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white lg:text-3xl">Nexosign</span>
      </div>
      <p className="max-w-xs text-center text-sm leading-relaxed text-white/60 lg:max-w-sm lg:text-left lg:text-base">
        {t('headline')}
      </p>
    </>
  );
}

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col text-foreground lg:grid lg:grid-cols-2">
      <div className="relative flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-accent-600 px-6 py-10 lg:py-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-accent-400/10" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.03]" />
        </div>

        <FadeIn direction="right" duration={0.5}>
          <div className="relative z-10 flex flex-col items-center gap-4 lg:items-start lg:gap-6">
            <BrandingPanel />
          </div>
        </FadeIn>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-[var(--th-page-bg)] px-4 py-10 lg:py-0">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <FadeIn direction="up" duration={0.5} delay={0.15}>
          <div className="w-full max-w-xl">{children}</div>
        </FadeIn>
      </div>
    </div>
  );
}
