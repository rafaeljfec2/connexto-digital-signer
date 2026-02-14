'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Check, HelpCircle } from 'lucide-react';
import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll';

const PLANS = [
  {
    nameKey: 'starterName' as const,
    priceKey: 'starterPrice' as const,
    periodKey: 'starterPeriod' as const,
    descriptionKey: 'starterDescription' as const,
    features: ['starterFeature1', 'starterFeature2', 'starterFeature3', 'starterFeature4'] as const,
    ctaKey: 'starterCta' as const,
    highlighted: false,
  },
  {
    nameKey: 'professionalName' as const,
    priceKey: 'professionalPrice' as const,
    periodKey: 'professionalPeriod' as const,
    descriptionKey: 'professionalDescription' as const,
    features: [
      'professionalFeature1',
      'professionalFeature2',
      'professionalFeature3',
      'professionalFeature4',
      'professionalFeature5',
      'professionalFeature6',
    ] as const,
    ctaKey: 'professionalCta' as const,
    highlighted: true,
  },
  {
    nameKey: 'businessName' as const,
    priceKey: 'businessPrice' as const,
    periodKey: 'businessPeriod' as const,
    descriptionKey: 'businessDescription' as const,
    features: [
      'businessFeature1',
      'businessFeature2',
      'businessFeature3',
      'businessFeature4',
      'businessFeature5',
      'businessFeature6',
    ] as const,
    ctaKey: 'businessCta' as const,
    highlighted: false,
  },
];

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5'] as const;

export default function PricingPage() {
  const t = useTranslations('pricingPage');

  return (
    <>
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                {t('headline')}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/50 md:text-lg">
                {t('subheadline')}
              </p>
            </div>
          </AnimateOnScroll>

          <div className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-3 md:gap-5 lg:gap-8">
            {PLANS.map((plan, index) => (
              <AnimateOnScroll key={plan.nameKey} variant="scale" stagger={index + 1} className="h-full">
                <div
                  className={`landing-card group relative flex h-full flex-col rounded-2xl border p-6 md:p-8 ${
                    plan.highlighted
                      ? 'border-accent-400/30 bg-accent-400/[0.06]'
                      : 'border-white/5 bg-white/[0.03] hover:border-accent-400/20 hover:bg-white/[0.06]'
                  }`}
                >
                  {plan.highlighted ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-400 px-4 py-1 text-xs font-semibold text-brand-900">
                      {t('popularBadge')}
                    </div>
                  ) : null}

                  <h3 className="text-lg font-semibold text-white">{t(plan.nameKey)}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white md:text-4xl">{t(plan.priceKey)}</span>
                    <span className="text-sm text-white/40">{t(plan.periodKey)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">{t(plan.descriptionKey)}</p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((featureKey) => (
                      <li key={featureKey} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                        <span className="text-sm text-white/60">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all hover:scale-105 ${
                      plan.highlighted
                        ? 'btn-primary-themed shadow-lg hover:shadow-xl'
                        : 'border border-white/20 text-white/80 hover:border-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t(plan.ctaKey)}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white/[0.02] py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="mb-12 flex items-center gap-3">
              <HelpCircle className="h-6 w-6 text-accent-400" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {t('faqHeadline')}
              </h2>
            </div>
          </AnimateOnScroll>

          <div className="space-y-6">
            {FAQ_KEYS.map((faqKey, index) => (
              <AnimateOnScroll key={faqKey} variant="slide-left" stagger={index + 1}>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <h3 className="text-base font-semibold text-white">
                    {t(`${faqKey}Question`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {t(`${faqKey}Answer`)}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
