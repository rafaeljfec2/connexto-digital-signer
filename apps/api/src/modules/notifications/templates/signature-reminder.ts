import {
  emailCtaButton,
  emailDocumentCard,
  emailGreeting,
  emailHeadline,
  emailSecurityNotice,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
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
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    signerName: context.signerName,
    documentTitle: context.documentTitle,
    signUrl: context.signUrl,
    reminderCount: context.reminderCount,
    maxReminders: context.maxReminders,
  });

  const subject = interpolate(messages.subject, plainVars);
  const text = interpolate(messages.textBody, plainVars);

  const content = [
    emailHeadline(interpolate(messages.headline, htmlVars)),
    emailGreeting(
      interpolate(messages.greeting, htmlVars),
      interpolate(messages.body, htmlVars),
    ),
    emailDocumentCard(String(htmlVars['documentTitle'] ?? ''), messages.documentStatus),
    emailCtaButton(context.signUrl, interpolate(messages.cta, htmlVars)),
    emailSecurityNotice(shared.securityNotice),
    emailTrustBadges(shared),
  ].join('\n');

  return {
    subject,
    text,
    html: wrapInBaseLayout(content, subject, shared),
  };
}
