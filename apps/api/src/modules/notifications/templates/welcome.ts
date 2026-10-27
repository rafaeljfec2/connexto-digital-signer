import {
  emailCtaButton,
  emailGreeting,
  emailHeadline,
  emailTrustBadges,
  escapeHtmlVars,
  wrapInBaseLayout,
} from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

export interface WelcomeContext {
  ownerName: string;
  dashboardUrl: string;
}

export function renderWelcome(
  context: WelcomeContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale).welcome;
  const shared = getEmailMessages(locale).shared;
  const plainVars: Record<string, unknown> = { ...context };
  const htmlVars = escapeHtmlVars({
    ownerName: context.ownerName,
    dashboardUrl: context.dashboardUrl,
  });

  const subject = interpolate(messages.subject, plainVars);
  const text = interpolate(messages.textBody, plainVars);

  const content = [
    emailHeadline(interpolate(messages.headline, htmlVars)),
    emailGreeting(
      interpolate(messages.greeting, htmlVars),
      interpolate(messages.body, htmlVars),
    ),
    emailCtaButton(context.dashboardUrl, interpolate(messages.cta, htmlVars)),
    emailTrustBadges(shared),
  ].join('\n');

  return {
    subject,
    text,
    html: wrapInBaseLayout(content, subject, shared),
  };
}
