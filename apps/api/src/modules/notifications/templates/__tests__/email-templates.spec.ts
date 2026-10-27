import { renderDocumentCompleted } from '../document-completed';
import { renderSignatureInvite } from '../signature-invite';
import { renderSignatureReminder } from '../signature-reminder';
import { renderVerificationCode } from '../verification-code';
import { renderWelcome } from '../welcome';

const brandMarkers = {
  brand: 'Nexosign',
  taglinePt: 'ASSINATURA ELETRÔNICA',
  taglineEn: 'ELECTRONIC SIGNATURE',
  footer: 'Assinaturas eletrônicas com rastreabilidade',
  badgeIdentity: 'Identidade verificada',
} as const;

describe('email templates shared layout', () => {
  test('signature invite keeps brand shell and trust badges', () => {
    const result = renderSignatureInvite(
      {
        signerName: 'Rafael',
        organizationName: 'Connexto Tecnologia Ltda',
        documentTitle: 'Novo documento.pdf',
        signUrl: 'https://example.com/sign/token',
      },
      'pt-br',
    );

    expect(result.html).toContain(brandMarkers.brand);
    expect(result.html).toContain(brandMarkers.taglinePt);
    expect(result.html).toContain(brandMarkers.footer);
    expect(result.html).toContain(brandMarkers.badgeIdentity);
    expect(result.html).toContain('Revisar e assinar documento');
  });

  test('signature reminder uses the shared card layout', () => {
    const result = renderSignatureReminder(
      {
        signerName: 'Rafael',
        documentTitle: 'Contrato.pdf',
        signUrl: 'https://example.com/sign/token',
        reminderCount: 1,
        maxReminders: 3,
      },
      'pt-br',
    );

    expect(result.html).toContain(brandMarkers.taglinePt);
    expect(result.html).toContain('Lembrete de assinatura');
    expect(result.html).toContain('Contrato.pdf');
    expect(result.html).toContain('href="https://example.com/sign/token"');
    expect(result.html).toContain(brandMarkers.badgeIdentity);
  });

  test('document completed uses the shared card layout', () => {
    const result = renderDocumentCompleted(
      {
        ownerName: 'Rafael',
        documentTitle: 'Contrato.pdf',
        documentUrl: 'https://example.com/documents/1',
      },
      'pt-br',
    );

    expect(result.html).toContain('Documento assinado com sucesso');
    expect(result.html).toContain('Documento concluído');
    expect(result.html).toContain('href="https://example.com/documents/1"');
    expect(result.html).toContain(brandMarkers.footer);
  });

  test('welcome uses the shared card layout', () => {
    const result = renderWelcome(
      {
        ownerName: 'Rafael',
        dashboardUrl: 'https://example.com/dashboard',
      },
      'pt-br',
    );

    expect(result.html).toContain('Sua conta está pronta');
    expect(result.html).toContain('href="https://example.com/dashboard"');
    expect(result.html).toContain(brandMarkers.badgeIdentity);
  });

  test('verification code uses the shared card layout and escapes code', () => {
    const result = renderVerificationCode(
      {
        signerName: 'Rafael',
        documentTitle: 'Doc <x>.pdf',
        code: '<1234>',
      },
      'en',
    );

    expect(result.html).toContain(brandMarkers.taglineEn);
    expect(result.html).toContain('Verification code');
    expect(result.html).toContain('&lt;1234&gt;');
    expect(result.html).toContain('Doc &lt;x&gt;.pdf');
    expect(result.html).not.toContain('<1234>');
  });
});
