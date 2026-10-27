import {
  emailCtaButton,
  emailDocumentCard,
  emailGreeting,
  emailHeadline,
  emailMessageBlock,
  emailSecurityNotice,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface SignatureInviteContext {
  signerName: string;
  organizationName: string;
  documentTitle: string;
  signUrl: string;
  message?: string;
}

export function renderSignatureInvite(
  context: SignatureInviteContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['signature-invite'];
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    signerName: context.signerName,
    organizationName: context.organizationName,
    documentTitle: context.documentTitle,
    signUrl: context.signUrl,
  });

  const subject = interpolate(messages.subject, plainVars);
  const text = interpolate(messages.textBody, plainVars);
  const messageBlock = context.message
    ? emailMessageBlock(messages.bodyMessage, context.message)
    : '';

  const content = [
    emailHeadline(interpolate(messages.headline, htmlVars)),
    emailGreeting(
      interpolate(messages.greeting, htmlVars),
      interpolate(messages.body, htmlVars),
    ),
    messageBlock,
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
