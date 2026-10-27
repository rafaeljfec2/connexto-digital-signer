import {
  emailCtaButton,
  emailDocumentCard,
  emailGreeting,
  emailHeadline,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface DocumentCompletedContext {
  ownerName: string;
  documentTitle: string;
  documentUrl: string;
}

export function renderDocumentCompleted(
  context: DocumentCompletedContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['document-completed'];
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    ownerName: context.ownerName,
    documentTitle: context.documentTitle,
    documentUrl: context.documentUrl,
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
    emailCtaButton(context.documentUrl, interpolate(messages.cta, htmlVars)),
    emailTrustBadges(shared),
  ].join('\n');

  return {
    subject,
    text,
    html: wrapInBaseLayout(content, subject, shared),
  };
}
