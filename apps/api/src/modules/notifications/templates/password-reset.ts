import {
  emailGreeting,
  emailHeadline,
  emailParagraph,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface PasswordResetContext {
  ownerName: string;
  resetUrl: string;
}

export function renderPasswordReset(
  context: PasswordResetContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['password-reset'];
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    ownerName: context.ownerName,
    resetUrl: context.resetUrl,
  });

  const subject = interpolate(messages.subject, plainVars);
  const text = interpolate(messages.textBody, plainVars);

  const content = [
    emailHeadline(interpolate(messages.headline, htmlVars)),
    emailGreeting(
      interpolate(messages.greeting, htmlVars),
      interpolate(messages.body, htmlVars),
    ),
    emailParagraph(`<a href="${context.resetUrl}">${messages.cta}</a>`),
    emailTrustBadges(shared),
  ].join('\n');

  return { subject, text, html: wrapInBaseLayout(content, subject, shared) };
}
