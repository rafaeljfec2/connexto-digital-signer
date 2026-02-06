import { PdfService } from './pdf.service';

const buildSigner = (overrides?: Partial<{ userAgent: string | null; ipAddress: string | null }>) => ({
  name: 'Jane Doe',
  email: 'jane@acme.com',
  signedAt: '2026-01-02T00:00:00.000Z',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  ...overrides,
});

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(() => {
    service = new PdfService();
  });

  test('should append evidence page and return buffer', async () => {
    const original = Buffer.from(
      'JVBERi0xLjQKJaqrrK0KNCAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDMgMCBSCi9NZWRpYUJveFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCAxMTM+PnN0cmVhbQpCBiAgMC4wIDAgMCBSCjAgMCAwIDAKZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzQgMCBSXT4+CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAzIDAgUj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTI4IDAwMDAwIG4gCjAwMDAwMDAyMjAgMDAwMDAgbiAKMDAwMDAwMDM1MCAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ2NQolJUVPRgo=',
      'base64'
    );
    const signers = [
      buildSigner({ userAgent: 'u'.repeat(120) }),
      buildSigner({ ipAddress: null, userAgent: null }),
    ];

    const result = await service.appendEvidencePage(original, signers, 'Agreement');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should compute hash', () => {
    const hash = service.computeHash(Buffer.from('value'));
    expect(hash).toBe('cd42404d52ad55ccfa9aca4adc828aa5800ad9d385a0671fbcbf724118320619');
  });
});
