import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as forge from 'node-forge';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { PDFDocument } from 'pdf-lib';
import { Tenant } from '../entities/tenant.entity';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';

interface CertificateMetadata {
  readonly subject: string;
  readonly issuer: string;
  readonly expiresAt: Date;
}

export interface CertificateStatusDto {
  readonly subject: string;
  readonly issuer: string;
  readonly expiresAt: string;
  readonly configuredAt: string;
  readonly isExpired: boolean;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env['CERTIFICATE_ENCRYPTION_KEY'];
  if (!key) {
    throw new Error('CERTIFICATE_ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

function encryptPassword(password: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPassword(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly storageService: S3StorageService,
  ) {}

  validateAndExtract(buffer: Buffer, password: string): CertificateMetadata {
    try {
      const asn1 = forge.asn1.fromDer(buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBagArray = certBags[forge.pki.oids.certBag];

      if (!certBagArray?.length) {
        throw new BadRequestException('No certificate found in the .p12 file');
      }

      const cert = certBagArray[0].cert;
      if (!cert) {
        throw new BadRequestException('Invalid certificate in the .p12 file');
      }

      const subject = cert.subject.getField('CN')?.value ?? cert.subject.attributes[0]?.value ?? 'Unknown';
      const issuer = cert.issuer.getField('CN')?.value ?? cert.issuer.attributes[0]?.value ?? 'Unknown';
      const expiresAt = cert.validity.notAfter;

      if (expiresAt < new Date()) {
        throw new BadRequestException('Certificate has expired');
      }

      return { subject: String(subject), issuer: String(issuer), expiresAt };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse certificate: ${message}`);
      throw new BadRequestException('Invalid certificate file or password');
    }
  }

  async uploadCertificate(
    tenantId: string,
    fileBuffer: Buffer,
    password: string,
  ): Promise<CertificateStatusDto> {
    const metadata = this.validateAndExtract(fileBuffer, password);

    const fileKey = `tenants/${tenantId}/certificate.p12`;
    await this.storageService.put(fileKey, fileBuffer, 'application/x-pkcs12');

    const encryptedPassword = encryptPassword(password);

    await this.tenantRepository.update(tenantId, {
      certificateFileKey: fileKey,
      certificatePasswordEnc: encryptedPassword,
      certificateSubject: metadata.subject,
      certificateIssuer: metadata.issuer,
      certificateExpiresAt: metadata.expiresAt,
      certificateConfiguredAt: new Date(),
    });

    return {
      subject: metadata.subject,
      issuer: metadata.issuer,
      expiresAt: metadata.expiresAt.toISOString(),
      configuredAt: new Date().toISOString(),
      isExpired: false,
    };
  }

  async getCertificateStatus(tenantId: string): Promise<CertificateStatusDto | null> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant?.certificateFileKey) return null;

    const isExpired = tenant.certificateExpiresAt
      ? tenant.certificateExpiresAt < new Date()
      : false;

    return {
      subject: tenant.certificateSubject ?? 'Unknown',
      issuer: tenant.certificateIssuer ?? 'Unknown',
      expiresAt: tenant.certificateExpiresAt?.toISOString() ?? '',
      configuredAt: tenant.certificateConfiguredAt?.toISOString() ?? '',
      isExpired,
    };
  }

  async removeCertificate(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant?.certificateFileKey) {
      throw new NotFoundException('No certificate configured');
    }

    try {
      await this.storageService.delete(tenant.certificateFileKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete certificate from storage: ${message}`);
    }

    await this.tenantRepository.update(tenantId, {
      certificateFileKey: null,
      certificatePasswordEnc: null,
      certificateSubject: null,
      certificateIssuer: null,
      certificateExpiresAt: null,
      certificateConfiguredAt: null,
    });
  }

  async signPdf(tenantId: string, pdfBuffer: Buffer): Promise<Buffer> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });

    if (!tenant?.certificateFileKey || !tenant.certificatePasswordEnc) {
      this.logger.warn(`No certificate configured for tenant ${tenantId}, skipping digital signature`);
      return pdfBuffer;
    }

    try {
      const p12Buffer = await this.storageService.get(tenant.certificateFileKey);
      const password = decryptPassword(tenant.certificatePasswordEnc);

      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const lastPage = pages.at(-1)!;

      pdflibAddPlaceholder({
        pdfDoc,
        pdfPage: lastPage,
        reason: 'Document digitally signed by Connexto Digital Signer',
        contactInfo: tenant.certificateSubject ?? '',
        name: tenant.certificateSubject ?? 'Connexto Digital Signer',
        location: '',
        signatureLength: 8192,
      });

      const pdfWithPlaceholder = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

      const signer = new P12Signer(p12Buffer, { passphrase: password });
      const signPdf = new SignPdf();
      const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);

      this.logger.log(`PDF digitally signed for tenant ${tenantId}`);
      return Buffer.from(signedPdf);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to digitally sign PDF for tenant ${tenantId}: ${message}`);
      throw new Error(`Failed to digitally sign PDF: ${message}`);
    }
  }

  async hasCertificate(tenantId: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'certificateFileKey'],
    });
    return !!tenant?.certificateFileKey;
  }
}
