'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/ui';
import { createTenant, type SignUpResponse } from '../api';
import { useAuth } from '../hooks/use-auth';
import { slugify } from '@/shared/utils/slug';

const schema = z
  .object({
    name: z.string().min(2),
    ownerName: z.string().min(2),
    ownerEmail: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    ownerPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/\d/),
    ownerPasswordConfirm: z.string().min(8),
  })
  .refine((data) => data.ownerPassword === data.ownerPasswordConfirm, {
    path: ['ownerPasswordConfirm'],
  });

type FormData = z.infer<typeof schema>;

export function SignUpForm() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [result, setResult] = useState<SignUpResponse | null>(null);
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: FormData) => {
    const { ownerPasswordConfirm: _confirm, ...rest } = data;
    const payload = { ...rest, slug: slugify(data.name) };
    const created = await createTenant(payload);
    setResult(created);
    await login({ email: data.ownerEmail, password: rest.ownerPassword });
    router.replace(`/${locale}`);
  };

  return (
    <div className="space-y-6">
      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="space-y-4">
          <div className="border-b border-th-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {tAuth('companySectionTitle')}
            </h2>
            <p className="text-xs text-foreground-muted">
              {tAuth('companySectionDescription')}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-foreground-muted" htmlFor="name">
              {tAuth('companyNameLabel')}
            </label>
            <Input id="name" placeholder={tAuth('companyNamePlaceholder')} {...register('name')} />
            {isSubmitted && errors.name ? (
              <p className="text-xs text-error">{tAuth('companyNameRequired')}</p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <div className="border-b border-th-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {tAuth('ownerSectionTitle')}
            </h2>
            <p className="text-xs text-foreground-muted">
              {tAuth('ownerSectionDescription')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted" htmlFor="ownerName">
                {tAuth('ownerNameLabel')}
              </label>
              <Input
                id="ownerName"
                placeholder={tAuth('ownerNamePlaceholder')}
                {...register('ownerName')}
              />
              {isSubmitted && errors.ownerName ? (
                <p className="text-xs text-error">{tAuth('ownerNameRequired')}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted" htmlFor="ownerEmail">
                {tAuth('ownerEmailLabel')}
              </label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder={tAuth('ownerEmailPlaceholder')}
                {...register('ownerEmail')}
              />
              {isSubmitted && errors.ownerEmail ? (
                <p className="text-xs text-error">{tAuth('ownerEmailRequired')}</p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <div className="border-b border-th-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {tAuth('securitySectionTitle')}
            </h2>
            <p className="text-xs text-foreground-muted">
              {tAuth('securitySectionDescription')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted" htmlFor="ownerPassword">
                {tAuth('ownerPasswordLabel')}
              </label>
              <Input
                id="ownerPassword"
                type="password"
                placeholder={tAuth('ownerPasswordPlaceholder')}
                {...register('ownerPassword')}
              />
              {isSubmitted && errors.ownerPassword ? (
                <p className="text-xs text-error">{tAuth('ownerPasswordRequired')}</p>
              ) : (
                <p className="text-xs text-foreground-muted">{tAuth('ownerPasswordHelper')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-normal text-foreground-muted" htmlFor="ownerPasswordConfirm">
                {tAuth('ownerPasswordConfirmLabel')}
              </label>
              <Input
                id="ownerPasswordConfirm"
                type="password"
                placeholder={tAuth('ownerPasswordConfirmPlaceholder')}
                {...register('ownerPasswordConfirm')}
              />
              {isSubmitted && errors.ownerPasswordConfirm ? (
                <p className="text-xs text-error">{tAuth('ownerPasswordConfirmError')}</p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {tAuth('createAccountCta')}
        </Button>
      </form>

      {result ? (
        <div className="rounded-xl border border-th-border bg-th-hover p-4 text-sm text-foreground">
          <div className="font-medium">{tCommon('accountCreatedTitle')}</div>
          <p className="mt-2 text-sm text-foreground-muted">
            {tCommon('accountCreatedSubtitle')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
