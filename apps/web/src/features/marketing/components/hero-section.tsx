'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export function HeroSection() {
  const t = useTranslations('landing.hero');

  return (
    <section className="hero-gradient-bg relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-600/10 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="animate-pulse-glow mb-6 inline-flex items-center gap-2 rounded-full border border-accent-400/20 bg-accent-400/10 px-4 py-1.5"
            style={{ animation: 'fade-in 0.6s ease-out both, pulse-glow 3s ease-in-out 1s infinite' }}
          >
            <ShieldCheck className="h-4 w-4 text-accent-400" />
            <span className="text-xs font-medium tracking-wide text-accent-200">
              {t('badge')}
            </span>
          </div>

          <h1
            className="text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
            style={{ animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both' }}
          >
            {t('headline')}
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg"
            style={{ animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}
          >
            {t('subheadline')}
          </p>

          <div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
            style={{ animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both' }}
          >
            <Link
              href="/signup"
              className="cta-shimmer btn-primary-themed inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all hover:scale-105 hover:shadow-xl sm:w-auto"
            >
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white sm:w-auto"
            >
              {t('ctaSecondary')}
            </a>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-brand-900 to-transparent"
      />
    </section>
  );
}
