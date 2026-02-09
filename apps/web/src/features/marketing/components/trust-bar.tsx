'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck, Hash, UserCheck, ClipboardList } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const TRUST_ITEMS = [
  { key: 'legalValidity' as const, Icon: ShieldCheck },
  { key: 'sha256' as const, Icon: Hash },
  { key: 'identityVerification' as const, Icon: UserCheck },
  { key: 'auditTrail' as const, Icon: ClipboardList },
];

export function TrustBar() {
  const t = useTranslations('landing.trustBar');

  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {TRUST_ITEMS.map(({ key, Icon }, index) => (
            <AnimateOnScroll key={key} stagger={index + 1}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-400/10 transition-colors group-hover:bg-accent-400/20">
                  <Icon className="h-4 w-4 text-accent-400" />
                </div>
                <span className="text-xs font-medium leading-tight text-white/50 md:text-sm">
                  {t(key)}
                </span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
