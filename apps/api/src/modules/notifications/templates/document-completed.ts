import { wrapInBaseLayout, ctaButton, paragraph } from './base-layout';
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
  const vars: Record<string, unknown> = { ...context };

  const subject = interpolate(messages.subject, vars);
  const text = interpolate(messages.textBody, vars);

  const content = [
    paragraph(interpolate(messages.greeting, vars)),
    paragraph(interpolate(messages.body, vars)),
    ctaButton(context.documentUrl, interpolate(messages.cta, vars)),
    paragraph(interpolate(messages.footer, vars), 'muted'),
  ].join('\n');

  const html = wrapInBaseLayout(content, subject);

  return { subject, text, html };
}
