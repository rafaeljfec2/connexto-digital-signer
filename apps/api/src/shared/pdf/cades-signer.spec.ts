import * as forge from 'node-forge';
import { CadesSigner } from './cades-signer';
import * as asn1Helpers from './asn1-helpers';

jest.mock('./asn1-helpers', () => ({
  CMS_OID: {
    CONTENT_TYPE: '1.2.840.113549.1.9.3',
    DATA: '1.2.840.113549.1.7.1',
    SIGNING_TIME: '1.2.840.113549.1.9.5',
    MESSAGE_DIGEST: '1.2.840.113549.1.9.4',
  },
  asn1Oid: jest.fn((value: string) => ({ type: 'oid', value })),
  asn1Seq: jest.fn((value: unknown[]) => ({ type: 'seq', value })),
  asn1Set: jest.fn((value: unknown[]) => ({ type: 'set', value })),
  asn1OctetString: jest.fn((value: string) => ({ type: 'octet', value })),
  asn1UtcTime: jest.fn(() => ({ type: 'utctime' })),
  sha256AlgorithmId: jest.fn(),
  sha256Digest: jest.fn(() => 'digest-binary'),
  buildSigningCertificateV2Attr: jest.fn(() => ({ type: 'signingCertificateV2' })),
  buildCmsContentInfo: jest.fn(() => Buffer.from('cms-content')),
  extractP12Credentials: jest.fn(),
}));

describe('CadesSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate detached CAdES-BES with signingTime attribute', () => {
    const mockPrivateKey = {
      sign: jest.fn(() => 'signature-binary'),
    };
    const mockCertificate = {} as forge.pki.Certificate;
    const mockDigest = {
      update: jest.fn(),
    } as unknown as forge.md.MessageDigest;

    const toDerSpy = jest
      .spyOn(forge.asn1, 'toDer')
      .mockReturnValue({ getBytes: () => 'signed-attrs-bytes' } as forge.util.ByteBuffer);
    const digestFactorySpy = jest.spyOn(forge.md.sha256, 'create').mockReturnValue(mockDigest);

    const helpers = jest.mocked(asn1Helpers);
    helpers.extractP12Credentials.mockReturnValue({
      privateKey: mockPrivateKey as unknown as forge.pki.PrivateKey,
      certificate: mockCertificate,
      allCerts: [mockCertificate],
    });

    const signer = new CadesSigner(Buffer.from('p12'), 'password');
    const result = signer.signDetached(Buffer.from('pdf-content'));

    expect(result).toEqual(Buffer.from('cms-content'));
    expect(helpers.asn1Oid).toHaveBeenCalledWith(helpers.CMS_OID.SIGNING_TIME);
    expect(mockPrivateKey.sign).toHaveBeenCalledWith(mockDigest, 'RSASSA-PKCS1-V1_5');
    expect(helpers.buildCmsContentInfo).toHaveBeenCalled();
    expect(toDerSpy).toHaveBeenCalled();
    expect(digestFactorySpy).toHaveBeenCalled();
  });
});
