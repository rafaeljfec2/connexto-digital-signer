export {
  EMAIL_CLIENT,
  type EmailClient,
  type EmailRecipient,
  type SendEmailInput,
  type SendEmailResult,
} from './email-client';
export { createEmailClientFromEnv, resolveEmailDriver, type EmailDriver } from './email-driver';
export { InMemoryEmailClient } from './in-memory-email.client';
export { LoggerEmailClient } from './logger-email.client';
export { MailerSendEmailClient } from './mailersend-email.client';
