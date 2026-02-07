import { wrapInBaseLayout, ctaButton, paragraph } from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface WelcomeContext {
  ownerName: string;
  dashboardUrl: string;
}

export function renderWelcome(
  context: WelcomeContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['welcome'];
  const vars: Record<string, unknown> = { ...context };

  const subject = interpolate(messages.subject, vars);
  const text = interpolate(messages.textBody, vars);

  const content = [
    paragraph(interpolate(messages.greeting, vars)),
    paragraph(interpolate(messages.body, vars)),
    ctaButton(context.dashboardUrl, interpolate(messages.cta, vars)),
    paragraph(interpolate(messages.footer, vars), 'muted'),
  ].join('\n');

  const html = wrapInBaseLayout(content, subject);

  return { subject, text, html };
}
