import type { ReactNode } from 'react';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-[var(--gradient-auth)] flex items-center justify-center px-4 py-10">
      {children}
    </div>
  );
}
