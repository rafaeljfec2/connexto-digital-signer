'use client';

import { useTranslations } from 'next-intl';
import { Target, UserCheck, ClipboardList, Users, Bell, Globe } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const FEATURES = [
  { titleKey: 'positionedFieldsTitle' as const, descKey: 'positionedFieldsDescription' as const, Icon: Target },
  { titleKey: 'identityTitle' as const, descKey: 'identityDescription' as const, Icon: UserCheck },
  { titleKey: 'auditTitle' as const, descKey: 'auditDescription' as const, Icon: ClipboardList },
  { titleKey: 'multiSignerTitle' as const, descKey: 'multiSignerDescription' as const, Icon: Users },
  { titleKey: 'remindersTitle' as const, descKey: 'remindersDescription' as const, Icon: Bell },
  { titleKey: 'multiLangTitle' as const, descKey: 'multiLangDescription' as const, Icon: Globe },
];

export function FeaturesGrid() {
  const t = useTranslations('landing.features');

  return (
    <section id="features" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <AnimateOnScroll>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            {t('headline')}
          </h2>
        </AnimateOnScroll>

        <div className="mt-12 grid grid-cols-1 gap-5 md:mt-16 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {FEATURES.map(({ titleKey, descKey, Icon }, index) => (
            <AnimateOnScroll key={titleKey} variant="scale" stagger={index + 1}>
              <div className="landing-card group rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-accent-400/20 hover:bg-white/[0.06]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                  <Icon className="h-5 w-5 text-accent-400" />
                </div>
                <h3 className="text-base font-semibold text-white">
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
