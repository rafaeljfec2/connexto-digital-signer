import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomInt } from 'node:crypto';
import { Signer } from '../entities/signer.entity';
import { SignaturesService } from './signatures.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { DocumentsService } from '../../documents/services/documents.service';

const OTP_EXPIRATION_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly signaturesService: SignaturesService,
    private readonly notificationsService: NotificationsService,
    private readonly documentsService: DocumentsService,
  ) {}

  async sendCode(accessToken: string): Promise<{ sent: true }> {
    const signer = await this.signaturesService.findByToken(accessToken);

    if (signer.authMethod !== 'email') {
      throw new BadRequestException('Verification is not required for this signer');
    }

    const otp = String(randomInt(0, 999999)).padStart(6, '0');
    const hash = this.hashCode(otp);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRATION_MINUTES);

    signer.verificationCode = hash;
    signer.verificationExpiresAt = expiresAt;
    signer.verificationAttempts = 0;
    await this.signerRepository.save(signer);

    const document = await this.documentsService.findOne(
      signer.documentId,
      signer.tenantId,
    );

    const locale = document.signingLanguage ?? 'en';

    await this.notificationsService.sendVerificationCode({
      signerEmail: signer.email,
      signerName: signer.name,
      documentTitle: document.title,
      code: otp,
      locale,
    });

    return { sent: true };
  }

  async verifyCode(
    accessToken: string,
    code: string,
  ): Promise<{ verified: true }> {
    const signer = await this.signaturesService.findByToken(accessToken);

    if (signer.authMethod !== 'email') {
      throw new BadRequestException('Verification is not required for this signer');
    }

    if (signer.verificationCode === null || signer.verificationExpiresAt === null) {
      throw new BadRequestException('No verification code was sent. Please request a new code.');
    }

    if (signer.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    if (new Date() > signer.verificationExpiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    const hash = this.hashCode(code);

    if (hash !== signer.verificationCode) {
      signer.verificationAttempts += 1;
      await this.signerRepository.save(signer);
      throw new BadRequestException('Invalid verification code');
    }

    signer.verifiedAt = new Date();
    signer.verificationCode = null;
    signer.verificationExpiresAt = null;
    signer.verificationAttempts = 0;
    await this.signerRepository.save(signer);

    return { verified: true };
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
