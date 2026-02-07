import type { LoginResponse } from './api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const MIDDLEWARE_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export const readToken = (): string | null => {
  if (globalThis.window === undefined) return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const readStoredUser = (): LoginResponse['user'] | null => {
  if (globalThis.window === undefined) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse['user'];
  } catch {
    return null;
  }
};

export const writeAuthStorage = (token: string, user: LoginResponse['user']): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `auth_token=${token}; path=/; max-age=${MIDDLEWARE_COOKIE_MAX_AGE}`;
};

export const clearAuthStorage = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'auth_token=; path=/; max-age=0';
};
