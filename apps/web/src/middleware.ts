import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
});

export function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];

  if (!locales.includes(locale as (typeof locales)[number])) {
    return intlResponse;
  }

  const pathWithoutLocale = `/${segments.slice(1).join('/')}`;
  const isPublic = pathWithoutLocale === '/login' || pathWithoutLocale === '/signup';
  const token = request.cookies.get('auth_token')?.value;

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (token && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|pdfjs).*)'],
};
