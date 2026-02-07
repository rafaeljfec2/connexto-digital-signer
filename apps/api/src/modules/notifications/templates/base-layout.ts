const FONT_FAMILY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export function wrapInBaseLayout(content: string, previewText: string): string {
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
  <title>Connexto Digital Signer</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${FONT_FAMILY};" bgcolor="#f1f5f9">
  <!--[if !mso]><!-->
  <div style="font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(previewText)}
  </div>
  <!--<![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#0e3a6e" style="background-color:#0e3a6e;border-radius:12px 12px 0 0;padding:24px 32px;">
              <h1 style="margin:0;padding:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;font-family:${FONT_FAMILY};">
                Connexto
              </h1>
              <p style="margin:4px 0 0 0;padding:0;font-size:12px;color:#7dd3fc;letter-spacing:1px;font-family:${FONT_FAMILY};">
                DIGITAL SIGNER
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;font-family:${FONT_FAMILY};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#f8fafc" style="background-color:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;border:1px solid #e2e8f0;border-top:none;">
              <p style="margin:0;padding:0;font-size:12px;color:#94a3b8;line-height:22px;font-family:${FONT_FAMILY};">
                &copy; ${year} Connexto Digital Signer.
              </p>
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

export function ctaButton(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:24px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="#0ea5e9" style="background-color:#0ea5e9;border-radius:8px;padding:14px 32px;">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
               style="font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${FONT_FAMILY};">
              ${escapeHtml(label)}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function paragraph(text: string, variant?: string): string {
  const color = variant === 'muted' ? '#64748b' : '#334155';
  const fontSize = variant === 'muted' ? '14px' : '15px';
  return `<p style="margin:0 0 16px 0;padding:0;font-size:${fontSize};line-height:24px;color:${color};font-family:${FONT_FAMILY};">${text}</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
