'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { loginWithEmail, type LoginInput, type LoginResponse } from '../api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const readStoredUser = (): LoginResponse['user'] | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse['user'];
  } catch {
    return null;
  }
};

const writeAuthStorage = (token: string, user: LoginResponse['user']): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `auth_token=${token}; path=/; max-age=86400`;
};

const clearAuthStorage = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'auth_token=; path=/; max-age=0';
};

export const useAuth = () => {
  const [user, setUser] = useState<LoginResponse['user'] | null>(() => readStoredUser());

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => loginWithEmail(input),
    onSuccess: (data) => {
      writeAuthStorage(data.accessToken, data.user);
      setUser(data.user);
    },
  });

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
  }, []);

  const isAuthenticated = useMemo(() => user !== null, [user]);

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    loginStatus: loginMutation.status,
    loginError: loginMutation.error,
    logout,
  };
};
