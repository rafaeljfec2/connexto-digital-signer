import type { EmailClient } from './email-client';
import { InMemoryEmailClient } from './in-memory-email.client';
import { LoggerEmailClient } from './logger-email.client';
import { MailerSendEmailClient } from './mailersend-email.client';

export type EmailDriver = 'mailersend' | 'logger' | 'inmemory';

const DEFAULT_FROM_EMAIL = 'noreply@connexto.com.br';
const DEFAULT_FROM_NAME = 'NexoSign';

const isEmailDriver = (value: string): value is EmailDriver =>
  value === 'mailersend' || value === 'logger' || value === 'inmemory';

export const resolveEmailDriver = (): EmailDriver => {
  const explicit = process.env['EMAIL_DRIVER'];
  if (explicit !== undefined && explicit !== '') {
    if (!isEmailDriver(explicit)) {
      throw new Error(`Unsupported EMAIL_DRIVER: ${explicit}`);
    }
    return explicit;
  }

  if (process.env['NODE_ENV'] === 'production') {
    return 'mailersend';
  }

  if (process.env['MAILERSEND_API_KEY']) {
    return 'mailersend';
  }

  return 'logger';
};

export const createEmailClientFromEnv = (): EmailClient => {
  const driver = resolveEmailDriver();
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction && driver !== 'mailersend') {
    throw new Error(
      'EMAIL_DRIVER must be "mailersend" in production (logger and inmemory drivers do not deliver email)',
    );
  }

  switch (driver) {
    case 'mailersend': {
      const apiKey = process.env['MAILERSEND_API_KEY'];
      if (!apiKey) {
        throw new Error('MAILERSEND_API_KEY is required when EMAIL_DRIVER=mailersend');
      }
      return new MailerSendEmailClient({
        apiKey,
        fromEmail: process.env['MAILERSEND_FROM_EMAIL'] ?? DEFAULT_FROM_EMAIL,
        fromName: process.env['MAILERSEND_FROM_NAME'] ?? DEFAULT_FROM_NAME,
      });
    }
    case 'inmemory':
      return new InMemoryEmailClient();
    case 'logger':
      return new LoggerEmailClient();
    default: {
      const exhaustive: never = driver;
      throw new Error(`Unsupported EMAIL_DRIVER: ${String(exhaustive)}`);
    }
  }
};
