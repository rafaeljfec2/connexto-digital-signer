import * as forge from 'node-forge';
import { Signer } from '@signpdf/signpdf';

const OID = {
  SIGNED_DATA: '1.2.840.113549.1.7.2',
  DATA: '1.2.840.113549.1.7.1',
  SHA256: '2.16.840.1.101.3.4.2.1',
  RSA_ENCRYPTION: '1.2.840.113549.1.1.1',
  CONTENT_TYPE: '1.2.840.113549.1.9.3',
  MESSAGE_DIGEST: '1.2.840.113549.1.9.4',
  SIGNING_CERTIFICATE_V2: '1.2.840.113549.1.9.16.2.47',
} as const;

interface PadesSignerOptions {
  readonly passphrase?: string;
  readonly asn1StrictParsing?: boolean;
}

function oid(value: string): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OID,
    false,
    forge.asn1.oidToDer(value).getBytes(),
  );
}

function seq(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    children,
  );
}

function set(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    children,
  );
}

function octetString(value: string): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OCTETSTRING,
    false,
    value,
  );
}

function integer(value: number): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    forge.asn1.integerToDer(value).getBytes(),
  );
}

function nullValue(): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.NULL,
    false,
    '',
  );
}

function contextTag(tag: number, children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    tag,
    true,
    children,
  );
}

function sha256AlgorithmIdentifier(): forge.asn1.Asn1 {
  return seq([oid(OID.SHA256), nullValue()]);
}

function sha256Digest(data: string): string {
  const md = forge.md.sha256.create();
  md.update(data);
  return md.digest().getBytes();
}

export class PadesSigner extends Signer {
  private readonly certBuffer: forge.util.ByteStringBuffer;
  private readonly passphrase: string;
  private readonly asn1StrictParsing: boolean;

  constructor(p12Buffer: Buffer, options: PadesSignerOptions = {}) {
    super();
    this.passphrase = options.passphrase ?? '';
    this.asn1StrictParsing = options.asn1StrictParsing ?? false;
    this.certBuffer = forge.util.createBuffer(p12Buffer.toString('binary'));
  }

  override async sign(pdfBuffer: Buffer): Promise<Buffer> {
    if (!(pdfBuffer instanceof Buffer)) {
      throw new TypeError('PDF expected as Buffer.');
    }

    const { privateKey, certificate, allCerts } = this.extractCredentials();
    const contentDigest = sha256Digest(pdfBuffer.toString('binary'));
    const signedAttrs = this.buildSignedAttributes(contentDigest, certificate);

    const signedAttrsSetForSigning = set([...signedAttrs]);
    const signedAttrsBytes = forge.asn1.toDer(signedAttrsSetForSigning).getBytes();

    const attrsMd = forge.md.sha256.create();
    attrsMd.update(signedAttrsBytes);
    const signature = (privateKey as forge.pki.rsa.PrivateKey).sign(attrsMd, 'RSASSA-PKCS1-V1_5');

    return this.buildCmsContentInfo(certificate, allCerts, signedAttrs, signature);
  }

  private extractCredentials(): {
    privateKey: forge.pki.PrivateKey;
    certificate: forge.pki.Certificate;
    allCerts: forge.pki.Certificate[];
  } {
    const p12Asn1 = forge.asn1.fromDer(this.certBuffer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(
      p12Asn1,
      this.asn1StrictParsing,
      this.passphrase,
    );

    const certBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag];

    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (!keyBags?.[0]?.key) {
      throw new Error('No private key found in the P12 file.');
    }

    const privateKey = keyBags[0].key;
    let certificate: forge.pki.Certificate | undefined;
    const allCerts: forge.pki.Certificate[] = [];

    for (const bag of Object.values(certBags ?? {})) {
      const cert = (bag as { cert: forge.pki.Certificate }).cert;
      if (!cert) continue;
      allCerts.push(cert);

      const pub = cert.publicKey as forge.pki.rsa.PublicKey;
      const priv = privateKey;
      if (pub.n.compareTo(priv.n) === 0 && pub.e.compareTo(priv.e) === 0) {
        certificate = cert;
      }
    }

    if (!certificate) {
      throw new Error('Failed to find a certificate that matches the private key.');
    }

    return { privateKey, certificate, allCerts };
  }

  private buildSignedAttributes(
    contentDigest: string,
    certificate: forge.pki.Certificate,
  ): forge.asn1.Asn1[] {
    const contentTypeAttr = seq([
      oid(OID.CONTENT_TYPE),
      set([oid(OID.DATA)]),
    ]);

    const messageDigestAttr = seq([
      oid(OID.MESSAGE_DIGEST),
      set([octetString(contentDigest)]),
    ]);

    const signingCertV2Attr = this.buildSigningCertificateV2Attr(certificate);

    return [contentTypeAttr, messageDigestAttr, signingCertV2Attr];
  }

  private buildSigningCertificateV2Attr(
    certificate: forge.pki.Certificate,
  ): forge.asn1.Asn1 {
    const certDer = forge.asn1.toDer(
      forge.pki.certificateToAsn1(certificate),
    ).getBytes();
    const certHash = sha256Digest(certDer);

    const essCertIdV2 = seq([
      sha256AlgorithmIdentifier(),
      octetString(certHash),
    ]);

    const signingCertificateV2 = seq([seq([essCertIdV2])]);

    return seq([
      oid(OID.SIGNING_CERTIFICATE_V2),
      set([signingCertificateV2]),
    ]);
  }

  private buildCmsContentInfo(
    certificate: forge.pki.Certificate,
    allCerts: forge.pki.Certificate[],
    signedAttrs: forge.asn1.Asn1[],
    signature: string,
  ): Buffer {
    const issuerAsn1 = forge.pki.distinguishedNameToAsn1(certificate.issuer);
    const serialBytes = forge.util.hexToBytes(certificate.serialNumber);

    const signerInfo = seq([
      integer(1),
      seq([
        issuerAsn1,
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.INTEGER,
          false,
          serialBytes,
        ),
      ]),
      sha256AlgorithmIdentifier(),
      contextTag(0, signedAttrs),
      seq([oid(OID.RSA_ENCRYPTION), nullValue()]),
      octetString(signature),
    ]);

    const certsAsn1 = allCerts.map((c) => forge.pki.certificateToAsn1(c));

    const signedData = seq([
      integer(1),
      set([sha256AlgorithmIdentifier()]),
      seq([oid(OID.DATA)]),
      contextTag(0, certsAsn1),
      set([signerInfo]),
    ]);

    const contentInfo = seq([
      oid(OID.SIGNED_DATA),
      contextTag(0, [signedData]),
    ]);

    return Buffer.from(
      forge.asn1.toDer(contentInfo).getBytes(),
      'binary',
    );
  }
}
