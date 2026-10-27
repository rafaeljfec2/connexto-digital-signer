import { renderSignatureInvite } from '../signature-invite';

const baseContext = {
  signerName: 'Rafael',
  organizationName: 'Connexto Tecnologia Ltda',
  documentTitle: 'Novo documento.pdf',
  signUrl: 'https://example.com/sign/token-123',
} as const;

describe('renderSignatureInvite', () => {
  test('should render invite card with organization, cta and trust badges', () => {
    const result = renderSignatureInvite(baseContext, 'pt-br');

    expect(result.subject).toContain('Você recebeu um documento para assinar');
    expect(result.subject).toContain(baseContext.documentTitle);
    expect(result.text).toContain(baseContext.organizationName);
    expect(result.text).toContain(baseContext.signUrl);

    expect(result.html).toContain('Nexosign');
    expect(result.html).toContain('ASSINATURA ELETRÔNICA');
    expect(result.html).toContain('Você recebeu um documento para assinar');
    expect(result.html).toContain(baseContext.organizationName);
    expect(result.html).toContain(baseContext.documentTitle);
    expect(result.html).toContain('Documento aguardando sua assinatura');
    expect(result.html).toContain(`href="${baseContext.signUrl}"`);
    expect(result.html).toContain('Revisar e assinar documento');
    expect(result.html).toContain('Identidade verificada');
    expect(result.html).toContain('Integridade do documento');
    expect(result.html).toContain('SHA-256');
    expect(result.html).toContain('Trilha de auditoria');
    expect(result.html).toContain('Assinaturas eletrônicas com rastreabilidade');
  });

  test('should escape html in dynamic fields', () => {
    const result = renderSignatureInvite(
      {
        signerName: '<script>alert(1)</script>',
        organizationName: 'Acme <Ltd>',
        documentTitle: 'Doc & "Quote".pdf',
        signUrl: 'https://example.com/sign?x="y"',
      },
      'en',
    );

    expect(result.html).not.toContain('<script>alert(1)</script>');
    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result.html).toContain('Acme &lt;Ltd&gt;');
    expect(result.html).toContain('Doc &amp; &quot;Quote&quot;.pdf');
    expect(result.html).toContain('href="https://example.com/sign?x=&quot;y&quot;"');
  });

  test('should include optional sender message when provided', () => {
    const result = renderSignatureInvite(
      {
        ...baseContext,
        message: 'Please review carefully',
      },
      'en',
    );

    expect(result.html).toContain('Message from sender:');
    expect(result.html).toContain('Please review carefully');
  });

  test('should render english copy for en locale', () => {
    const result = renderSignatureInvite(baseContext, 'en');

    expect(result.subject).toContain('You received a document to sign');
    expect(result.html).toContain('ELECTRONIC SIGNATURE');
    expect(result.html).toContain('Review and sign document');
    expect(result.html).toContain('Verified identity');
    expect(result.html).toContain('Audit trail');
  });
});
