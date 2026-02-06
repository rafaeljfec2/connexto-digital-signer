import '@/shared/styles/globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  );
}
