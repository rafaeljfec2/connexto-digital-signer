import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/shared/ui/card';
import { SignUpForm } from '@/features/auth/components/signup-form';

export default async function SignUpPage() {
  const tCommon = await getTranslations('common');

  return (
    <Card variant="glass" className="w-full max-w-md p-8 text-foreground">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="text-2xl font-medium">{tCommon('appName')}</div>
          <p className="mt-1 text-sm text-foreground-muted">{tCommon('createAccount')}</p>
        </div>
        <SignUpForm />
        <p className="text-center text-xs text-foreground-muted">
          {tCommon('alreadyHaveAccount')}{' '}
          <Link className="text-accent-200 underline" href="/login">
            {tCommon('signIn')}
          </Link>
        </p>
      </div>
    </Card>
  );
}
