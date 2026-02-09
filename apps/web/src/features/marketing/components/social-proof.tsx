'use client';

import { useTranslations } from 'next-intl';
import { Quote } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';
import { AnimatedCounter } from './animated-counter';

const METRICS = [
  { valueKey: 'metric1Value' as const, labelKey: 'metric1Label' as const },
  { valueKey: 'metric2Value' as const, labelKey: 'metric2Label' as const },
  { valueKey: 'metric3Value' as const, labelKey: 'metric3Label' as const },
];

export function SocialProof() {
  const t = useTranslations('landing.socialProof');

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            {t('headline')}
          </h2>
        </AnimateOnScroll>

        <div className="mt-12 grid grid-cols-3 gap-4 md:mt-16 md:gap-8">
          {METRICS.map(({ valueKey, labelKey }, index) => (
            <AnimateOnScroll key={valueKey} stagger={index + 1}>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400 md:text-4xl">
                  <AnimatedCounter value={t(valueKey)} />
                </div>
                <div className="mt-1 text-xs text-white/40 md:text-sm">
                  {t(labelKey)}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll variant="scale" className="mx-auto mt-12 max-w-2xl md:mt-16">
          <div className="landing-card rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-accent-400/20 md:p-8">
            <Quote className="mb-4 h-8 w-8 text-accent-400/30" />
            <blockquote className="text-sm leading-relaxed text-white/70 italic md:text-base">
              &ldquo;{t('testimonialQuote')}&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-400/20 text-sm font-semibold text-accent-400">
                {t('testimonialName').charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{t('testimonialName')}</div>
                <div className="text-xs text-white/40">
                  {t('testimonialRole')} &middot; {t('testimonialCompany')}
                </div>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
