'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function DashboardPage() {
  const tDashboard = useTranslations('dashboard');
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-text">{tDashboard('title')}</h1>
      <p className="text-sm text-muted">
        {user ? `${tDashboard('welcome')}, ${user.name}` : tDashboard('welcome')}
      </p>
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        {tDashboard('underConstruction')}
      </div>
    </div>
  );
}
