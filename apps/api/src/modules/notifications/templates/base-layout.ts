export function wrapInBaseLayout(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Connexto Digital Signer</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #0f172a !important; }
      .email-card { background-color: #1e293b !important; border-color: #334155 !important; }
      .email-text { color: #e2e8f0 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-header { background-color: #0c2d57 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(previewText)}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-body" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color:#0e3a6e;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                Connexto
              </h1>
              <p style="margin:4px 0 0;font-size:12px;color:#7dd3fc;letter-spacing:1px;text-transform:uppercase;">
                Digital Signer
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="email-card" style="background-color:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border:1px solid #e2e8f0;border-top:none;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                &copy; ${new Date().getFullYear()} Connexto Digital Signer.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
  <tr>
    <td align="center" style="background-color:#0ea5e9;border-radius:8px;">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function paragraph(text: string, className?: string): string {
  const style = className === 'muted'
    ? 'margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;'
    : 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;';
  const cssClass = className === 'muted' ? 'email-muted' : 'email-text';
  return `<p class="${cssClass}" style="${style}">${text}</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
