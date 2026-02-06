'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/ui';
import { createTenant, type SignUpResponse } from '../api';

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function SignUpForm() {
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [result, setResult] = useState<SignUpResponse | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const created = await createTenant(data);
    setResult(created);
  };

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text" htmlFor="name">
            {tAuth('companyNameLabel')}
          </label>
          <Input id="name" placeholder={tAuth('companyNamePlaceholder')} {...register('name')} />
          {errors.name && (
            <p className="text-xs text-destructive">{tAuth('companyNameRequired')}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text" htmlFor="slug">
            {tAuth('companySlugLabel')}
          </label>
          <Input id="slug" placeholder={tAuth('companySlugPlaceholder')} {...register('slug')} />
          {errors.slug && (
            <p className="text-xs text-destructive">{tAuth('slugRequired')}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text" htmlFor="ownerName">
            {tAuth('ownerNameLabel')}
          </label>
          <Input
            id="ownerName"
            placeholder={tAuth('ownerNamePlaceholder')}
            {...register('ownerName')}
          />
          {errors.ownerName && (
            <p className="text-xs text-destructive">{tAuth('ownerNameRequired')}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-text" htmlFor="ownerEmail">
            {tAuth('ownerEmailLabel')}
          </label>
          <Input
            id="ownerEmail"
            type="email"
            placeholder={tAuth('ownerEmailPlaceholder')}
            {...register('ownerEmail')}
          />
          {errors.ownerEmail && (
            <p className="text-xs text-destructive">{tAuth('ownerEmailRequired')}</p>
          )}
        </div>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {tAuth('createAccountCta')}
        </Button>
      </form>

      {result && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm text-text">
          <div className="font-semibold">{tCommon('credentialsTitle')}</div>
          <div className="mt-3 space-y-2">
            <div>
              <div className="text-xs text-muted">{tCommon('apiKey')}</div>
              <Input readOnly value={result.apiKey} />
            </div>
            <div>
              <div className="text-xs text-muted">{tCommon('ownerPassword')}</div>
              <Input readOnly value={result.ownerPassword} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
