import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { locales, defaultLocale } from '@/i18n';
import { clearAuthStorage, readToken, writeAuthStorage } from '@/features/auth/storage';

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

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeToRefresh = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback);
};

const notifySubscribers = (token: string): void => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const failSubscribers = (): void => {
  refreshSubscribers = [];
};

const isAuthPath = (pathname: string): boolean => {
  const locale = resolveLocaleFromPath(pathname);
  return pathname === `/${locale}/login` || pathname === `/${locale}/signup`;
};

const redirectToLogin = (): void => {
  if (globalThis.window === undefined) {
    return;
  }
  const pathname = globalThis.window.location.pathname;
  if (isAuthPath(pathname)) {
    return;
  }
  const locale = resolveLocaleFromPath(pathname);
  clearAuthStorage();
  globalThis.window.location.href = `/${locale}/login`;
};

interface RefreshResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: string;
    readonly tenantId: string;
  };
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      throw error;
    }

    if (globalThis.window === undefined) {
      throw error;
    }

    if (isAuthPath(globalThis.window.location.pathname)) {
      throw error;
    }

    if (isRefreshing) {
      return new Promise<ReturnType<typeof apiClient.request>>((resolve) => {
        subscribeToRefresh((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data } = await axios.post<RefreshResponse>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      writeAuthStorage(data.accessToken, data.user);

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      notifySubscribers(data.accessToken);
      return apiClient(originalRequest);
    } catch {
      failSubscribers();
      redirectToLogin();
      throw error;
    } finally {
      isRefreshing = false;
    }
  }
);
