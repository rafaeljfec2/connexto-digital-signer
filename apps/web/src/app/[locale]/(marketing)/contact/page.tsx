'use client';

import { useTranslations } from 'next-intl';
import { Mail, MessageSquare, Clock } from 'lucide-react';
import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll';

const CHANNELS = [
  { key: 'email' as const, Icon: Mail },
  { key: 'chat' as const, Icon: MessageSquare },
  { key: 'hours' as const, Icon: Clock },
];

export default function ContactPage() {
  const t = useTranslations('contactPage');

  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <AnimateOnScroll>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t('headline')}
            </h1>
            <p className="mt-4 text-base text-white/50 md:text-lg">
              {t('subheadline')}
            </p>
          </AnimateOnScroll>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:mt-16 md:grid-cols-3">
          {CHANNELS.map(({ key, Icon }, index) => (
            <AnimateOnScroll key={key} variant="scale" stagger={index + 1} className="h-full">
              <div className="landing-card group flex h-full flex-col items-center rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center hover:border-accent-400/20 hover:bg-white/[0.06]">
                <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-accent-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{t(`${key}Title`)}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{t(`${key}Description`)}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-xl">
          <AnimateOnScroll>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-xl font-semibold text-white">{t('formTitle')}</h2>
              <p className="mt-2 text-sm text-white/50">{t('formSubtitle')}</p>

              <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-white/70">
                    {t('nameLabel')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder={t('namePlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-accent-400/40 focus:bg-white/[0.08]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-white/70">
                    {t('emailLabel')}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-accent-400/40 focus:bg-white/[0.08]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-white/70">
                    {t('messageLabel')}
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder={t('messagePlaceholder')}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-accent-400/40 focus:bg-white/[0.08]"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-themed w-full rounded-lg px-6 py-3 text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  {t('submitButton')}
                </button>
              </form>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
