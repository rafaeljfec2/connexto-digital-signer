'use client';

import { useTranslations } from 'next-intl';
import { Upload, PenLine, ShieldCheck } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const STEPS = [
  { number: '01', titleKey: 'step1Title' as const, descKey: 'step1Description' as const, Icon: Upload },
  { number: '02', titleKey: 'step2Title' as const, descKey: 'step2Description' as const, Icon: PenLine },
  { number: '03', titleKey: 'step3Title' as const, descKey: 'step3Description' as const, Icon: ShieldCheck },
];

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');

  return (
    <section id="how-it-works" className="border-t border-white/5 bg-white/[0.02] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            {t('headline')}
          </h2>
        </AnimateOnScroll>

        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ number, titleKey, descKey, Icon }, index) => (
            <AnimateOnScroll key={number} variant="scale" stagger={index + 1} className="h-full">
              <div className="landing-card group relative flex h-full flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-accent-400/20 hover:bg-white/[0.06] md:p-8">
                <div className="mb-5 flex items-center gap-4">
                  <span className="text-3xl font-bold text-accent-400/30 transition-colors group-hover:text-accent-400/50">
                    {number}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                    <Icon className="h-5 w-5 text-accent-400" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white md:text-lg">
                  {t(titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {t(descKey)}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
