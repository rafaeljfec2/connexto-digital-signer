import * as forge from 'node-forge';

export const CMS_OID = {
  SIGNED_DATA: '1.2.840.113549.1.7.2',
  DATA: '1.2.840.113549.1.7.1',
  SHA256: '2.16.840.1.101.3.4.2.1',
  RSA_ENCRYPTION: '1.2.840.113549.1.1.1',
  CONTENT_TYPE: '1.2.840.113549.1.9.3',
  MESSAGE_DIGEST: '1.2.840.113549.1.9.4',
  SIGNING_TIME: '1.2.840.113549.1.9.5',
  SIGNING_CERTIFICATE_V2: '1.2.840.113549.1.9.16.2.47',
} as const;

export function asn1Oid(value: string): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OID,
    false,
    forge.asn1.oidToDer(value).getBytes(),
  );
}

export function asn1Seq(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    children,
  );
}

export function asn1Set(children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    children,
  );
}

export function asn1OctetString(value: string): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OCTETSTRING,
    false,
    value,
  );
}

export function asn1Integer(value: number): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    forge.asn1.integerToDer(value).getBytes(),
  );
}

export function asn1Null(): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.NULL,
    false,
    '',
  );
}

export function asn1ContextTag(tag: number, children: forge.asn1.Asn1[]): forge.asn1.Asn1 {
  return forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    tag,
    true,
    children,
  );
}

export function sha256AlgorithmId(): forge.asn1.Asn1 {
  return asn1Seq([asn1Oid(CMS_OID.SHA256), asn1Null()]);
}

export function sha256Digest(data: string): string {
  const md = forge.md.sha256.create();
  md.update(data);
  return md.digest().getBytes();
}

export function asn1UtcTime(date: Date): forge.asn1.Asn1 {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = pad(date.getUTCFullYear() % 100);
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const utcString = `${y}${m}${d}${h}${min}${s}Z`;

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.UTCTIME,
    false,
    utcString,
  );
}

export interface P12Credentials {
  readonly privateKey: forge.pki.PrivateKey;
  readonly certificate: forge.pki.Certificate;
  readonly allCerts: forge.pki.Certificate[];
}

export function extractP12Credentials(
  p12Buffer: Buffer,
  passphrase: string,
  strictParsing = false,
): P12Credentials {
  const derBuffer = forge.util.createBuffer(p12Buffer.toString('binary'));
  const p12Asn1 = forge.asn1.fromDer(derBuffer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, strictParsing, passphrase);

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

export function buildSigningCertificateV2Attr(
  certificate: forge.pki.Certificate,
): forge.asn1.Asn1 {
  const certDer = forge.asn1.toDer(
    forge.pki.certificateToAsn1(certificate),
  ).getBytes();
  const certHash = sha256Digest(certDer);

  const essCertIdV2 = asn1Seq([
    sha256AlgorithmId(),
    asn1OctetString(certHash),
  ]);

  const signingCertificateV2 = asn1Seq([asn1Seq([essCertIdV2])]);

  return asn1Seq([
    asn1Oid(CMS_OID.SIGNING_CERTIFICATE_V2),
    asn1Set([signingCertificateV2]),
  ]);
}

export function buildCmsContentInfo(
  certificate: forge.pki.Certificate,
  allCerts: forge.pki.Certificate[],
  signedAttrs: forge.asn1.Asn1[],
  signature: string,
): Buffer {
  const issuerAsn1 = forge.pki.distinguishedNameToAsn1(certificate.issuer);
  const serialBytes = forge.util.hexToBytes(certificate.serialNumber);

  const signerInfo = asn1Seq([
    asn1Integer(1),
    asn1Seq([
      issuerAsn1,
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        serialBytes,
      ),
    ]),
    sha256AlgorithmId(),
    asn1ContextTag(0, signedAttrs),
    asn1Seq([asn1Oid(CMS_OID.RSA_ENCRYPTION), asn1Null()]),
    asn1OctetString(signature),
  ]);

  const certsAsn1 = allCerts.map((c) => forge.pki.certificateToAsn1(c));

  const signedData = asn1Seq([
    asn1Integer(1),
    asn1Set([sha256AlgorithmId()]),
    asn1Seq([asn1Oid(CMS_OID.DATA)]),
    asn1ContextTag(0, certsAsn1),
    asn1Set([signerInfo]),
  ]);

  const contentInfo = asn1Seq([
    asn1Oid(CMS_OID.SIGNED_DATA),
    asn1ContextTag(0, [signedData]),
  ]);

  return Buffer.from(
    forge.asn1.toDer(contentInfo).getBytes(),
    'binary',
  );
}
