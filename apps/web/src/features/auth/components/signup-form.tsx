'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useController, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/ui';
import { createTenant, type SignUpResponse } from '../api';
import { useAuth } from '../hooks/use-auth';
import { slugify } from '@/shared/utils/slug';

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

type FormData = z.infer<typeof schema>;

export function SignUpForm() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [result, setResult] = useState<SignUpResponse | null>(null);
  const { login } = useAuth();
  const [slugTouched, setSlugTouched] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const nameValue = watch('name');
  const slugValue = watch('slug');

  const { field: slugField } = useController({ name: 'slug', control });

  useEffect(() => {
    if (slugTouched) return;
    const nextSlug = slugify(nameValue ?? '');
    setValue('slug', nextSlug, { shouldDirty: true, shouldValidate: true });
  }, [nameValue, setValue, slugTouched]);

  const onSubmit = async (data: FormData) => {
    const created = await createTenant(data);
    setResult(created);
    await login({ email: data.ownerEmail, password: created.ownerPassword });
    router.replace(`/${locale}`);
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
          <Input
            id="slug"
            placeholder={tAuth('companySlugPlaceholder')}
            value={slugField.value ?? ''}
            onChange={(event) => {
              setSlugTouched(true);
              slugField.onChange(event);
            }}
            onBlur={slugField.onBlur}
            name={slugField.name}
            ref={slugField.ref}
          />
          {!errors.slug && slugValue ? (
            <p className="text-xs text-muted">{tAuth('companySlugHelper')}</p>
          ) : null}
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
