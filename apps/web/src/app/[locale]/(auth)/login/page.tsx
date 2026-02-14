import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/features/auth/components/login-form';

export default async function LoginPage() {
  const tCommon = await getTranslations('common');

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground">
          {tCommon('accessAccount')}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {tCommon('appName')}
        </p>
      </div>
      <div className="rounded-2xl border border-th-border bg-th-card p-6 shadow-sm sm:p-8">
        <LoginForm />
      </div>
      <p className="text-center text-xs text-foreground-muted">
        {tCommon('newHere')}{' '}
        <Link className="text-primary font-medium hover:underline" href="/signup">
          {tCommon('createAccountLink')}
        </Link>
      </p>
    </div>
  );
}
