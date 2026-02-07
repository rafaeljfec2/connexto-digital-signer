import '@/shared/styles/globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} min-h-screen bg-background font-sans`}>
        {children}
      </body>
    </html>
  );
}
