import { Link } from '@/i18n/navigation';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MarketingFooter() {
  const t = useTranslations('landing.footer');

  return (
    <footer className="border-t border-white/10 bg-brand-900">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              Nexosign
            </Link>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
              <ShieldCheck className="h-4 w-4 text-accent-400/60" />
              <span>{t('badge')}</span>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              {t('product')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {t('features')}
                </a>
              </li>
              <li>
                <span className="text-sm text-white/30">{t('pricing')}</span>
              </li>
              <li>
                <span className="text-sm text-white/30">{t('docs')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              {t('company')}
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-white/30">{t('about')}</span>
              </li>
              <li>
                <span className="text-sm text-white/30">{t('contact')}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              {t('legal')}
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-white/30">{t('privacy')}</span>
              </li>
              <li>
                <span className="text-sm text-white/30">{t('terms')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} {t('copyright')}
        </div>
      </div>
    </footer>
  );
}
