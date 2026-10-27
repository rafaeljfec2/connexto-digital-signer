import {
  emailGreeting,
  emailHeadline,
  emailOtpCode,
  emailParagraph,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface VerificationCodeContext {
  signerName: string;
  documentTitle: string;
  code: string;
}

export function renderVerificationCode(
  context: VerificationCodeContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['verification-code'];
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    signerName: context.signerName,
    documentTitle: context.documentTitle,
    code: context.code,
  });

  const subject = interpolate(messages.subject, plainVars);
  const text = interpolate(messages.textBody, plainVars);

  const content = [
    emailHeadline(interpolate(messages.headline, htmlVars)),
    emailGreeting(
      interpolate(messages.greeting, htmlVars),
      interpolate(messages.body, htmlVars),
    ),
    emailOtpCode(context.code),
    emailParagraph(interpolate(messages.expiry, htmlVars), 'muted'),
    emailParagraph(interpolate(messages.footer, htmlVars), 'muted'),
    emailTrustBadges(shared),
  ].join('\n');

  return {
    subject,
    text,
    html: wrapInBaseLayout(content, subject, shared),
  };
}
