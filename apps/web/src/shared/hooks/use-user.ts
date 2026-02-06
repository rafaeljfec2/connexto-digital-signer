'use client';

import { useMemo } from 'react';

export interface StoredUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly tenantId: string;
}

const readUser = (): StoredUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const useUser = () => {
  const user = useMemo(() => readUser(), []);
  return { user };
};
