'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, ShieldCheck, Target, Users, Zap } from 'lucide-react';
import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll';

const VALUES = [
  { key: 'value1' as const, Icon: ShieldCheck },
  { key: 'value2' as const, Icon: Zap },
  { key: 'value3' as const, Icon: Users },
  { key: 'value4' as const, Icon: Target },
];

export default function AboutPage() {
  const t = useTranslations('aboutPage');

  return (
    <>
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <AnimateOnScroll>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                {t('headline')}
              </h1>
            </AnimateOnScroll>

            <AnimateOnScroll>
              <p className="mt-6 text-base leading-relaxed text-white/60 md:text-lg">
                {t('intro1')}
              </p>
            </AnimateOnScroll>

            <AnimateOnScroll>
              <p className="mt-4 text-base leading-relaxed text-white/60 md:text-lg">
                {t('intro2')}
              </p>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white/[0.02] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t('missionHeadline')}
            </h2>
          </AnimateOnScroll>

          <AnimateOnScroll>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-white/50">
              {t('missionText')}
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t('valuesHeadline')}
            </h2>
          </AnimateOnScroll>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ key, Icon }, index) => (
              <AnimateOnScroll key={key} variant="scale" stagger={index + 1} className="h-full">
                <div className="landing-card group flex h-full flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-accent-400/20 hover:bg-white/[0.06]">
                  <div className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                    <Icon className="h-5 w-5 text-accent-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{t(`${key}Title`)}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{t(`${key}Description`)}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white/[0.02] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <AnimateOnScroll variant="scale">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-accent-600 p-8 text-center md:p-16">
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {t('ctaHeadline')}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-white/70 md:text-base">
                {t('ctaSubheadline')}
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg transition-all hover:scale-105 hover:bg-white/90 hover:shadow-xl"
              >
                {t('ctaButton')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </>
  );
}
