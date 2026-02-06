'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors />
    </QueryClientProvider>
  );
}
