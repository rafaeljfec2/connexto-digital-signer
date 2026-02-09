'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

export function FinalCta() {
  const t = useTranslations('landing.finalCta');

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll variant="scale">
          <div className="cta-shimmer overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-accent-600 p-8 text-center md:p-16">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              {t('headline')}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-white/70 md:text-base">
              {t('subheadline')}
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg transition-all hover:scale-105 hover:bg-white/90 hover:shadow-xl"
            >
              {t('cta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
