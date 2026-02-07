import { wrapInBaseLayout, ctaButton, paragraph } from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface SignatureInviteContext {
  signerName: string;
  documentTitle: string;
  signUrl: string;
  message?: string;
}

export function renderSignatureInvite(
  context: SignatureInviteContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['signature-invite'];
  const vars: Record<string, unknown> = { ...context };

  const subject = interpolate(messages.subject, vars);
  const text = interpolate(messages.textBody, vars);

  const messageBlock = context.message
    ? `${paragraph(`<em>${interpolate(messages.bodyMessage, vars)}</em>`, 'muted')}
       ${paragraph(`"${context.message}"`)}`
    : '';

  const content = [
    paragraph(interpolate(messages.greeting, vars)),
    paragraph(interpolate(messages.body, vars)),
    messageBlock,
    ctaButton(context.signUrl, interpolate(messages.cta, vars)),
    paragraph(interpolate(messages.footer, vars), 'muted'),
  ].join('\n');

  const html = wrapInBaseLayout(content, subject);

  return { subject, text, html };
}
