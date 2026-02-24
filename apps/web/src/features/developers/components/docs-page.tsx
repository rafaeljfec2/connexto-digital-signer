"use client";

import { useTranslations } from 'next-intl';
import { FadeIn, PageTransition } from '@/shared/animations';

export function DocsPage() {
  const t = useTranslations('developers');
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';
  const docsUrl = baseUrl.replace(/\/digital-signer\/v1$/, '/digital-signer/v1/docs');

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{t('docs.title')}</h1>
          <p className="mt-1 text-sm text-foreground-subtle">{t('docs.description')}</p>
        </div>
      </FadeIn>
      <div className="overflow-hidden rounded-xl border border-th-border">
        <iframe
          src={docsUrl}
          title="API Documentation"
          className="h-[calc(100vh-200px)] w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </PageTransition>
  );
}
