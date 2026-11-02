'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button, Input } from '@/shared/ui';
import { requestPasswordReset } from '@/features/auth/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-medium text-white">{t('forgotPasswordTitle')}</h1>
        <p className="text-sm text-white/60">{t('forgotPasswordSubtitle')}</p>
      </div>
      {submitted ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {t('forgotPasswordSuccess')}
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            required
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            {t('forgotPasswordSubmit')}
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-accent-400 hover:underline">
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}
