'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, MessageSquare, Clock } from 'lucide-react';
import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll';

const CHANNELS = [
  { key: 'email' as const, Icon: Mail, mailto: true },
  { key: 'chat' as const, Icon: MessageSquare, mailto: false },
  { key: 'hours' as const, Icon: Clock, mailto: false },
] as const;

export default function ContactPage() {
  const t = useTranslations('contactPage');
  const supportEmail = t('emailDescription');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`NexoSign — ${name.trim() || t('formTitle')}`);
    const body = encodeURIComponent(
      `${t('nameLabel')}: ${name.trim()}\n${t('emailLabel')}: ${email.trim()}\n\n${message.trim()}`,
    );
    globalThis.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

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
          {CHANNELS.map(({ key, Icon, mailto }, index) => (
            <AnimateOnScroll key={key} variant="scale" stagger={index + 1} className="h-full">
              <div className="landing-card group flex h-full flex-col items-center rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center hover:border-accent-400/20 hover:bg-white/[0.06]">
                <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-400/10 transition-all group-hover:bg-accent-400/20 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-accent-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{t(`${key}Title`)}</h3>
                {mailto ? (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-2 flex-1 text-sm leading-relaxed text-accent-400/90 hover:text-accent-400"
                  >
                    {t(`${key}Description`)}
                  </a>
                ) : (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{t(`${key}Description`)}</p>
                )}
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-xl">
          <AnimateOnScroll>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 md:p-8">
              <h2 className="text-xl font-semibold text-white">{t('formTitle')}</h2>
              <p className="mt-2 text-sm text-white/50">{t('formSubtitle')}</p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-white/70">
                    {t('nameLabel')}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('messagePlaceholder')}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-accent-400/40 focus:bg-white/[0.08]"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-themed w-full rounded-lg px-6 py-3 text-sm font-medium transition-all"
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
