import axios from 'axios';
import { locales, defaultLocale } from '@/i18n';
import { clearAuthStorage, readToken } from '@/features/auth/storage';

const baseURL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const resolveLocaleFromPath = (pathname: string): string => {
  const [, locale] = pathname.split('/');
  if (locales.includes(locale as (typeof locales)[number])) {
    return locale as (typeof locales)[number];
  }
  return defaultLocale;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (globalThis.window !== undefined && error?.response?.status === 401) {
      const pathname = globalThis.window.location.pathname;
      const locale = resolveLocaleFromPath(pathname);
      const isLogin = pathname === `/${locale}/login`;
      const isSignup = pathname === `/${locale}/signup`;
      if (!isLogin && !isSignup) {
        clearAuthStorage();
        globalThis.window.location.href = `/${locale}/login`;
      }
    }
    return Promise.reject(error);
  }
);
