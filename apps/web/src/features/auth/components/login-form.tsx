'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { StepTransition } from '@/shared/animations';
import { useAuth } from '../hooks/use-auth';
import { checkEmail } from '../api';

const emailSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});

const passwordSchema = z.object({
  password: z.string().min(1),
});

type EmailData = z.infer<typeof emailSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

type LoginStep = 'email' | 'password';

export function LoginForm() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations('auth');
  const { login, loginStatus } = useAuth();

  const [step, setStep] = useState<LoginStep>('email');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailRef = useRef('');
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const handleEmailSubmit = useCallback(async (data: EmailData) => {
    setEmailError(null);
    setCheckingEmail(true);
    try {
      const result = await checkEmail(data.email);
      if (!result.exists) {
        setEmailError(tAuth('emailNotFound'));
        return;
      }
      emailRef.current = data.email;
      setDirection(1);
      setStep('password');
      setTimeout(() => passwordInputRef.current?.focus(), 350);
    } catch {
      setEmailError(tAuth('emailNotFound'));
    } finally {
      setCheckingEmail(false);
    }
  }, [tAuth]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    setStep('email');
    passwordForm.reset();
  }, [passwordForm]);

  const handlePasswordSubmit = useCallback(async (data: PasswordData) => {
    await login({ email: emailRef.current, password: data.password });
    router.replace(`/${locale}`);
  }, [login, router, locale]);

  return (
    <StepTransition stepKey={step} direction={direction}>
      {step === 'email' ? (
        <form className="space-y-4" onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted" htmlFor="email">
              {tAuth('emailLabel')}
            </label>
            <Input
              id="email"
              type="email"
              autoFocus
              placeholder={tAuth('emailPlaceholder')}
              {...emailForm.register('email', {
                onChange: () => setEmailError(null),
              })}
            />
            {emailForm.formState.errors.email ? (
              <p className="text-xs text-error">{tAuth('emailInvalid')}</p>
            ) : null}
            {emailError === null ? null : (
              <p className="text-xs text-error">{emailError}</p>
            )}
          </div>
          <Button className="w-full" type="submit" isLoading={checkingEmail}>
            {tAuth('continue')}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tAuth('back')}
          </button>

          <div className="flex items-center gap-2.5 rounded-lg border border-th-border bg-th-hover/50 px-3 py-2">
            <Mail className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <span className="truncate text-sm text-foreground">{emailRef.current}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted" htmlFor="password">
              {tAuth('passwordLabel')}
            </label>
            <Input
              id="password"
              type="password"
              autoFocus
              placeholder={tAuth('passwordPlaceholder')}
              {...passwordForm.register('password')}
              ref={(el) => {
                passwordForm.register('password').ref(el);
                passwordInputRef.current = el;
              }}
            />
            {passwordForm.formState.errors.password ? (
              <p className="text-xs text-error">{tAuth('passwordRequired')}</p>
            ) : null}
          </div>

          <Button className="w-full" type="submit" disabled={loginStatus === 'pending'}>
            {tAuth('signInCta')}
          </Button>
        </form>
      )}
    </StepTransition>
  );
}
