import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/features/auth/components/signup-form';

export default async function SignUpPage() {
  const tCommon = await getTranslations('common');

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground">
          {tCommon('createAccount')}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {tCommon('appName')}
        </p>
      </div>
      <SignUpForm />
      <p className="text-center text-xs text-foreground-muted">
        {tCommon('alreadyHaveAccount')}{' '}
        <Link className="text-primary font-medium hover:underline" href="/login">
          {tCommon('signIn')}
        </Link>
      </p>
    </div>
  );
}
