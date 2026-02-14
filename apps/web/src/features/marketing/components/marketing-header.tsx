'use client';

import { Link } from '@/i18n/navigation';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function MarketingHeader() {
  const t = useTranslations('landing.header');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-brand-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Nexosign
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm text-white/60 transition-colors hover:text-white">
            {t('features')}
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm text-white/60 transition-colors hover:text-white"
          >
            {t('howItWorks')}
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-white/60 transition-colors hover:text-white"
          >
            {t('pricing')}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-white/80 transition-colors hover:text-white"
          >
            {t('signIn')}
          </Link>
          <Link
            href="/signup"
            className="btn-primary-themed rounded-lg px-4 py-2 text-sm font-medium"
          >
            {t('startFree')}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-white/80 md:hidden"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-white/10 bg-brand-900/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            <Link
              href="/#features"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t('features')}
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t('howItWorks')}
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t('pricing')}
            </Link>
            <div className="my-2 border-t border-white/10" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/signup"
              className="btn-primary-themed mt-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium"
            >
              {t('startFree')}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
