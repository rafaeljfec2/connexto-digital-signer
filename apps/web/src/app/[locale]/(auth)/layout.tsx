"use client";

import type { ReactNode } from 'react';
import { FadeIn } from '@/shared/animations';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--th-page-bg)]  flex items-center justify-center px-4 py-12 text-foreground">
      <FadeIn duration={0.5}>
        {children}
      </FadeIn>
    </div>
  );
}
