import type { ReactNode } from 'react';
import { MarketingHeader } from '@/features/marketing/components/marketing-header';
import { MarketingFooter } from '@/features/marketing/components/marketing-footer';

export default function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-brand-900 text-white">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
