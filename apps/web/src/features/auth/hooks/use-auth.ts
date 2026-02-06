'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { loginWithEmail, type LoginInput, type LoginResponse } from '../api';
import { clearAuthStorage, readStoredUser, writeAuthStorage } from '../storage';

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
