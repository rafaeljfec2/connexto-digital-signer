export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const NAVY = '#0e3a6e';
const BUTTON_BLUE = '#0ea5e9';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const CARD_BG = '#f8fafc';
const PAGE_BG = '#eef2f7';

export interface EmailBrandCopy {
  readonly brandTagline: string;
  readonly footerBrand: string;
}

export interface EmailTrustBadgeCopy {
  readonly badgeIdentity: string;
  readonly badgeIntegrity: string;
  readonly badgeIntegrityAlgo: string;
  readonly badgeAudit: string;
}

export function escapeHtml(str: string): string {
  const ampEntity = '&' + 'amp;';
  const ltEntity = '&' + 'lt;';
  const gtEntity = '&' + 'gt;';
  const quoteEntity = '&' + 'quot;';

  return str
    .replaceAll('&', ampEntity)
    .replaceAll('<', ltEntity)
    .replaceAll('>', gtEntity)
    .replaceAll('"', quoteEntity);
}

export function escapeHtmlVars(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const escaped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    escaped[key] =
      value === undefined || value === null ? '' : escapeHtml(String(value));
  }
  return escaped;
}

export function wrapInBaseLayout(
  content: string,
  previewText: string,
  brand: EmailBrandCopy,
): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>Nexosign</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:${EMAIL_FONT};" bgcolor="${PAGE_BG}">
  <!--[if !mso]><!-->
  <div style="font-size:1px;color:${PAGE_BG};line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(previewText)}
  </div>
  <!--<![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE_BG}" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid ${BORDER};">
          <tr>
            <td style="padding:40px 36px 32px 36px;font-family:${EMAIL_FONT};">
              ${buildBrandHeader(brand.brandTagline)}
              ${content}
              ${buildFooter(brand.footerBrand, year)}
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeadline(text: string): string {
  return `<h1 style="margin:0 0 28px 0;padding:0;font-size:26px;font-weight:700;line-height:34px;color:${NAVY};text-align:center;font-family:${EMAIL_FONT};">${text}</h1>`;
}

export function emailGreeting(greeting: string, body: string): string {
  return `<p style="margin:0 0 8px 0;padding:0;font-size:15px;line-height:24px;color:#334155;font-family:${EMAIL_FONT};">${greeting}</p>
<p style="margin:0 0 24px 0;padding:0;font-size:15px;line-height:24px;color:#334155;font-family:${EMAIL_FONT};">${body}</p>`;
}

export function emailParagraph(text: string, variant?: 'muted'): string {
  const color = variant === 'muted' ? MUTED : '#334155';
  const fontSize = variant === 'muted' ? '13px' : '15px';
  return `<p style="margin:0 0 16px 0;padding:0;font-size:${fontSize};line-height:24px;color:${color};text-align:center;font-family:${EMAIL_FONT};">${text}</p>`;
}

export function emailMessageBlock(label: string, message: string): string {
  return `<p style="margin:0 0 4px 0;padding:0;font-size:13px;line-height:20px;color:${MUTED};font-family:${EMAIL_FONT};"><em>${escapeHtml(label)}</em></p>
<p style="margin:0 0 24px 0;padding:0;font-size:15px;line-height:24px;color:#334155;font-family:${EMAIL_FONT};">"${escapeHtml(message)}"</p>`;
}

export function emailDocumentCard(title: string, status: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
  <tr>
    <td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44" valign="middle" style="padding-right:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#ef4444" width="40" height="40" style="background-color:#ef4444;border-radius:8px;width:40px;height:40px;font-size:11px;font-weight:700;color:#ffffff;font-family:${EMAIL_FONT};">
                  PDF
                </td>
              </tr>
            </table>
          </td>
          <td valign="middle">
            <p style="margin:0;padding:0;font-size:15px;font-weight:700;line-height:22px;color:${NAVY};font-family:${EMAIL_FONT};">${title}</p>
            <p style="margin:4px 0 0 0;padding:0;font-size:13px;line-height:18px;color:${MUTED};font-family:${EMAIL_FONT};">${escapeHtml(status)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function emailCtaButton(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
  <tr>
    <td align="center" bgcolor="${BUTTON_BLUE}" style="background-color:${BUTTON_BLUE};border-radius:10px;">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
         style="display:block;padding:16px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;font-family:${EMAIL_FONT};">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailSecurityNotice(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px 0;">
  <tr>
    <td align="center" style="font-size:12px;line-height:18px;color:#0284c7;font-family:${EMAIL_FONT};">
      <span style="display:inline-block;vertical-align:middle;margin-right:6px;width:14px;height:14px;border-radius:50%;background-color:#bae6fd;color:#0284c7;font-size:9px;line-height:14px;text-align:center;font-weight:700;">✓</span>
      ${escapeHtml(text)}
    </td>
  </tr>
</table>`;
}

export function emailTrustBadges(copy: EmailTrustBadgeCopy): string {
  const identity = badgeCell('#dbeafe', '#2563eb', '👤', copy.badgeIdentity);
  const integrity = badgeCell(
    '#dcfce7',
    '#16a34a',
    '#',
    copy.badgeIntegrity,
    copy.badgeIntegrityAlgo,
  );
  const audit = badgeCell('#ede9fe', '#7c3aed', '≡', copy.badgeAudit);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
  <tr>
    ${identity}
    <td width="1" bgcolor="${BORDER}" style="background-color:${BORDER};width:1px;font-size:0;line-height:0;">&nbsp;</td>
    ${integrity}
    <td width="1" bgcolor="${BORDER}" style="background-color:${BORDER};width:1px;font-size:0;line-height:0;">&nbsp;</td>
    ${audit}
  </tr>
</table>`;
}

export function emailOtpCode(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="${CARD_BG}" style="background-color:${CARD_BG};border-radius:12px;padding:20px 40px;border:1px solid ${BORDER};">
            <span style="font-size:36px;font-weight:700;color:${NAVY};letter-spacing:12px;font-family:${EMAIL_FONT};">
              ${escapeHtml(code)}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function buildBrandHeader(tagline: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:0 0 28px 0;">
      <p style="margin:0;padding:0;font-size:28px;font-weight:700;color:${NAVY};line-height:1.2;font-family:${EMAIL_FONT};">Nexosign</p>
      <p style="margin:8px 0 0 0;padding:0;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:2px;font-family:${EMAIL_FONT};">${escapeHtml(tagline)}</p>
    </td>
  </tr>
</table>`;
}

function buildFooter(brandLine: string, year: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="border-top:1px solid ${BORDER};padding:24px 0 0 0;" align="center">
      <p style="margin:0;padding:0;font-size:12px;line-height:18px;color:#94a3b8;font-family:${EMAIL_FONT};">${escapeHtml(brandLine)}</p>
      <p style="margin:8px 0 0 0;padding:0;font-size:12px;line-height:18px;color:#94a3b8;font-family:${EMAIL_FONT};">&copy; ${year} Nexosign</p>
    </td>
  </tr>
</table>`;
}

function badgeCell(
  bg: string,
  color: string,
  icon: string,
  label: string,
  sublabel?: string,
): string {
  const sub = sublabel
    ? `<p style="margin:4px 0 0 0;padding:0;font-size:11px;line-height:14px;color:#94a3b8;font-family:${EMAIL_FONT};">${escapeHtml(sublabel)}</p>`
    : '';

  return `<td width="33%" align="center" valign="top" style="padding:8px 10px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td align="center" bgcolor="${bg}" width="36" height="36" style="background-color:${bg};border-radius:18px;width:36px;height:36px;font-size:14px;line-height:36px;color:${color};font-family:${EMAIL_FONT};">
        ${icon}
      </td>
    </tr>
  </table>
  <p style="margin:10px 0 0 0;padding:0;font-size:12px;font-weight:600;line-height:16px;color:#334155;font-family:${EMAIL_FONT};">${escapeHtml(label)}</p>
  ${sub}
</td>`;
}
