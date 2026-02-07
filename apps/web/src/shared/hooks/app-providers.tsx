'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Toaster } from 'sonner';

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (isAxiosError(error) && error.response?.status === 401) {
    return false;
  }
  return failureCount < 3;
};

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors />
    </QueryClientProvider>
  );
}
