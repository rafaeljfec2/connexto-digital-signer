import { wrapInBaseLayout, paragraph } from './base-layout';
import { getEmailMessages, interpolate } from '../i18n';

const FONT_FAMILY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export interface VerificationCodeContext {
  signerName: string;
  documentTitle: string;
  code: string;
}

function otpCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:24px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="#f1f5f9" style="background-color:#f1f5f9;border-radius:12px;padding:20px 40px;border:2px dashed #cbd5e1;">
            <span style="font-size:36px;font-weight:700;color:#0e3a6e;letter-spacing:12px;font-family:${FONT_FAMILY};">
              ${code}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function renderVerificationCode(
  context: VerificationCodeContext,
  locale: string,
): { subject: string; text: string; html: string } {
  const messages = getEmailMessages(locale)['verification-code'];
  const vars: Record<string, unknown> = { ...context };

  const subject = interpolate(messages.subject, vars);
  const text = interpolate(messages.textBody, vars);

  const content = [
    paragraph(interpolate(messages.greeting, vars)),
    paragraph(interpolate(messages.body, vars)),
    otpCodeBlock(context.code),
    paragraph(interpolate(messages.expiry, vars), 'muted'),
    paragraph(interpolate(messages.footer, vars), 'muted'),
  ].join('\n');

  const html = wrapInBaseLayout(content, subject);

  return { subject, text, html };
}
