import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/shared/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export default async function LoginPage() {
  const tCommon = await getTranslations('common');

  return (
    <Card className="w-full max-w-md p-8">
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="text-2xl font-semibold text-text">{tCommon('appName')}</div>
          <p className="mt-1 text-sm text-muted">{tCommon('accessAccount')}</p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-muted">
          {tCommon('newHere')}{' '}
          <Link className="text-primary underline" href="/signup">
            {tCommon('createAccountLink')}
          </Link>
        </p>
      </div>
    </Card>
  );
}
