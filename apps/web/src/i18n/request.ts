import { getRequestConfig } from 'next-intl/server';
import { locales } from '../i18n';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'pt-br';
  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
