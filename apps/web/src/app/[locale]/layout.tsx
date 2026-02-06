import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppProviders } from '@/shared/hooks/app-providers';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: { locale: string } }>) {
  const { locale } = params;
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <AppProviders>{children}</AppProviders>
    </NextIntlClientProvider>
  );
}
