import * as forge from 'node-forge';
import {
  CMS_OID,
  asn1OctetString,
  asn1Oid,
  asn1Seq,
  asn1Set,
  asn1UtcTime,
  buildCmsContentInfo,
  buildSigningCertificateV2Attr,
  extractP12Credentials,
  sha256Digest,
} from './asn1-helpers';

export class CadesSigner {
  private readonly p12Buffer: Buffer;
  private readonly passphrase: string;

  constructor(p12Buffer: Buffer, passphrase: string) {
    this.p12Buffer = p12Buffer;
    this.passphrase = passphrase;
  }

  signDetached(contentBuffer: Buffer): Buffer {
    const { privateKey, certificate, allCerts } = extractP12Credentials(
      this.p12Buffer,
      this.passphrase
    );

    const contentDigest = sha256Digest(contentBuffer.toString('binary'));
    const signedAttrs = this.buildCadesSignedAttributes(contentDigest, certificate);

    const signedAttrsSetForSigning = asn1Set([...signedAttrs]);
    const signedAttrsBytes = forge.asn1.toDer(signedAttrsSetForSigning).getBytes();

    const attrsMd = forge.md.sha256.create();
    attrsMd.update(signedAttrsBytes);
    const signature = (privateKey as forge.pki.rsa.PrivateKey).sign(attrsMd, 'RSASSA-PKCS1-V1_5');

    return buildCmsContentInfo(certificate, allCerts, signedAttrs, signature);
  }

  private buildCadesSignedAttributes(
    contentDigest: string,
    certificate: forge.pki.Certificate
  ): forge.asn1.Asn1[] {
    const contentTypeAttr = asn1Seq([
      asn1Oid(CMS_OID.CONTENT_TYPE),
      asn1Set([asn1Oid(CMS_OID.DATA)]),
    ]);

    const signingTimeAttr = asn1Seq([
      asn1Oid(CMS_OID.SIGNING_TIME),
      asn1Set([asn1UtcTime(new Date())]),
    ]);

    const messageDigestAttr = asn1Seq([
      asn1Oid(CMS_OID.MESSAGE_DIGEST),
      asn1Set([asn1OctetString(contentDigest)]),
    ]);

    const signingCertV2Attr = buildSigningCertificateV2Attr(certificate);

    return [contentTypeAttr, signingTimeAttr, messageDigestAttr, signingCertV2Attr];
  }
}
