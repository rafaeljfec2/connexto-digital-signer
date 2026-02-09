'use client';

import { useTranslations } from 'next-intl';
import { Flag, Sparkles, Zap } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const DIFFERENTIALS = [
  { titleKey: 'brazilTitle' as const, descKey: 'brazilDescription' as const, Icon: Flag },
  { titleKey: 'uxTitle' as const, descKey: 'uxDescription' as const, Icon: Sparkles },
  { titleKey: 'setupTitle' as const, descKey: 'setupDescription' as const, Icon: Zap },
];

export function Differentials() {
  const t = useTranslations('landing.differentials');

  return (
    <section className="border-t border-white/5 bg-white/[0.02] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            {t('headline')}
          </h2>
        </AnimateOnScroll>

        <div className="mx-auto mt-12 max-w-3xl space-y-5 md:mt-16 md:space-y-6">
          {DIFFERENTIALS.map(({ titleKey, descKey, Icon }, index) => (
            <AnimateOnScroll key={titleKey} variant="slide-left" stagger={index + 1}>
              <div className="landing-card group flex gap-5 rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-accent-400/20 hover:bg-white/[0.06]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-accent-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {t(titleKey)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                    {t(descKey)}
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
