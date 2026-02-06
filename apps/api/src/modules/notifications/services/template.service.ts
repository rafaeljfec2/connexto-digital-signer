export function renderSignatureInvite(context: {
  signerName: string;
  documentTitle: string;
  signUrl: string;
  message?: string;
}): string {
  const messageBlock = context.message
    ? `\nMessage from sender:\n${context.message}\n`
    : '';
  return `
Hello ${context.signerName},

You have been invited to sign the document: ${context.documentTitle}.

Please follow this link to review and sign: ${context.signUrl}
${messageBlock}

This link is unique and should not be shared.
`.trim();
}

export function renderTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  if (template === 'signature-invite') {
    return renderSignatureInvite(context as Parameters<typeof renderSignatureInvite>[0]);
  }
  return JSON.stringify(context);
}
