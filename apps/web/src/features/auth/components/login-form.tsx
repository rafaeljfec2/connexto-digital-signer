'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/ui';
import { useAuth } from '../hooks/use-auth';

const schema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations('auth');
  const { login, loginStatus } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await login(data);
    router.replace(`/${locale}`);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-100" htmlFor="email">
          {tAuth('emailLabel')}
        </label>
        <Input
          id="email"
          type="email"
          placeholder={tAuth('emailPlaceholder')}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-error">{tAuth('emailInvalid')}</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-100" htmlFor="password">
          {tAuth('passwordLabel')}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={tAuth('passwordPlaceholder')}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-error">{tAuth('passwordRequired')}</p>
        )}
      </div>
      <Button className="w-full" type="submit" disabled={loginStatus === 'pending'}>
        {tAuth('signInCta')}
      </Button>
    </form>
  );
}
