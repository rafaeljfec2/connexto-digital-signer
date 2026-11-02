'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button, Input } from '@/shared/ui';
import { resetPassword } from '@/features/auth/api';

function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ token, password });
      router.push('/login');
    } catch {
      setError(t('resetPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-white/70">{t('resetPasswordMissingToken')}</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-medium text-white">{t('resetPasswordTitle')}</h1>
        <p className="text-sm text-white/60">{t('resetPasswordSubtitle')}</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('passwordPlaceholder')}
          required
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
          {t('resetPasswordSubmit')}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent-400 hover:underline">
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-white/70">…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
