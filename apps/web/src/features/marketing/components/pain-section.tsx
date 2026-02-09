'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const BULLET_KEYS = ['bullet1', 'bullet2', 'bullet3'] as const;

export function PainSection() {
  const t = useTranslations('landing.pain');

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <AnimateOnScroll>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl lg:text-4xl">
              {t('headline')}
            </h2>
          </AnimateOnScroll>

          <div className="mt-10 space-y-5">
            {BULLET_KEYS.map((key, index) => (
              <AnimateOnScroll key={key} variant="slide-left" stagger={index + 1}>
                <div className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-error/15">
                    <X className="h-3.5 w-3.5 text-error" />
                  </div>
                  <p className="text-sm leading-relaxed text-white/50 md:text-base">
                    {t(key)}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
