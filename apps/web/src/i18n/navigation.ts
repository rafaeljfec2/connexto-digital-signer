import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from '../i18n';

export const { Link, usePathname, useRouter } = createNavigation({
  locales: [...locales],
  defaultLocale,
});
