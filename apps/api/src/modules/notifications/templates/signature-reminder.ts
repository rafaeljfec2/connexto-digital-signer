import { wrapInBaseLayout, ctaButton, paragraph } from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface SignatureReminderContext {
  signerName: string;
  documentTitle: string;
  signUrl: string;
  reminderCount: number;
  maxReminders: number;
}

export function renderSignatureReminder(
  context: SignatureReminderContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['signature-reminder'];
  const vars: Record<string, unknown> = { ...context };

  const subject = interpolate(messages.subject, vars);
  const text = interpolate(messages.textBody, vars);

  const content = [
    paragraph(interpolate(messages.greeting, vars)),
    paragraph(interpolate(messages.body, vars)),
    ctaButton(context.signUrl, interpolate(messages.cta, vars)),
    paragraph(interpolate(messages.footer, vars), 'muted'),
  ].join('\n');

  const html = wrapInBaseLayout(content, subject);

  return { subject, text, html };
}
