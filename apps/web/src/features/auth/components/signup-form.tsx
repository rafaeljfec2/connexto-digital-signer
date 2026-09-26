'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/ui';
import { createTenant, type SignUpResponse } from '../api';
import { useAuth } from '../hooks/use-auth';
import { slugify } from '@/shared/utils/slug';
import {
  signupFormSchema,
  signupPasswordErrorKey,
  type SignupFormData,
} from './signup-form.schema';

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
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: SignupFormData) => {
    const payload = {
      name: data.name,
      slug: slugify(data.name),
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPassword: data.ownerPassword,
    };
    const created = await createTenant(payload);
    setResult(created);
    await login({ email: data.ownerEmail, password: data.ownerPassword });
    router.replace(`/${locale}`);
  };

  return (
    <div className="space-y-6">
      <form className="space-y-8" noValidate onSubmit={handleSubmit(onSubmit)}>
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
            <Input
              id="name"
              placeholder={tAuth('companyNamePlaceholder')}
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
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
                aria-invalid={Boolean(errors.ownerName)}
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
                aria-invalid={Boolean(errors.ownerEmail)}
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
                autoComplete="new-password"
                aria-invalid={Boolean(errors.ownerPassword)}
                {...register('ownerPassword')}
              />
              {isSubmitted && errors.ownerPassword ? (
                <p className="text-xs text-error">
                  {tAuth(signupPasswordErrorKey(errors.ownerPassword.message))}
                </p>
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
                autoComplete="new-password"
                aria-invalid={Boolean(errors.ownerPasswordConfirm)}
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
