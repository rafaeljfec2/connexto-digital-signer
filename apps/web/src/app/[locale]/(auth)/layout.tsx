import type { ReactNode } from 'react';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--th-page-bg)] dark:bg-gradient-main flex items-center justify-center px-4 py-12 text-foreground">
      {children}
    </div>
  );
}
