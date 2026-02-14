'use client';

import { useTranslations } from 'next-intl';
import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll';

const SECTIONS = [
  'dataCollection',
  'dataUsage',
  'dataSharing',
  'dataSecurity',
  'userRights',
  'cookies',
  'changes',
] as const;

export default function PrivacyPage() {
  const t = useTranslations('privacyPage');

  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            {t('headline')}
          </h1>
          <p className="mt-4 text-sm text-white/40">{t('lastUpdated')}</p>
          <p className="mt-6 text-base leading-relaxed text-white/60">
            {t('intro')}
          </p>
        </AnimateOnScroll>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((sectionKey, index) => (
            <AnimateOnScroll key={sectionKey} stagger={index + 1}>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {t(`${sectionKey}Title`)}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/50 md:text-base">
                  {t(`${sectionKey}Text`)}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll>
          <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white">{t('contactTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {t('contactText')}
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
