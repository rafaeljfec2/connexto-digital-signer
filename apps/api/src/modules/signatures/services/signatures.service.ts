import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { IdentifySignerDto } from '../dto/identify-signer.dto';
import { ListSignersQueryDto } from '../dto/list-signers-query.dto';
import { UpdateSignerDto } from '../dto/update-signer.dto';
import { Signer, SignerStatus } from '../entities/signer.entity';
import type { SignerPendingDocument } from '../interfaces/signer-document.interface';
import { TenantSignerService } from './tenant-signer.service';

export type {
  AuditTimelineEvent,
  AuditSignerInfo,
  DocumentAuditSummary,
  SigningContext,
} from '../interfaces/audit.interface';

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(Signer)
    private readonly signerRepository: Repository<Signer>,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly tenantSignerService: TenantSignerService,
  ) {}

  async addSigner(
    tenantId: string,
    envelopeId: string,
    createSignerDto: CreateSignerDto,
  ): Promise<Signer> {
    await this.envelopesService.findOne(envelopeId, tenantId);

    const tenantSigner = await this.tenantSignerService.findOrCreate(tenantId, {
      name: createSignerDto.name,
      email: createSignerDto.email,
      cpf: createSignerDto.cpf,
      phone: createSignerDto.phone,
      birthDate: createSignerDto.birthDate,
    });

    const accessToken = randomBytes(32).toString('hex');
    const signer = this.signerRepository.create({
      ...createSignerDto,
      tenantId,
      envelopeId,
      tenantSignerId: tenantSigner.id,
      accessToken,
    });
    return this.signerRepository.save(signer);
  }

  async updateSigner(
    tenantId: string,
    envelopeId: string,
    signerId: string,
    dto: UpdateSignerDto,
  ): Promise<Signer> {
    const signer = await this.findSignerOrFail({ id: signerId, envelopeId, tenantId });
    Object.assign(signer, dto);
    return this.signerRepository.save(signer);
  }

  async removeSigner(tenantId: string, envelopeId: string, signerId: string): Promise<void> {
    const signer = await this.findSignerOrFail({ id: signerId, envelopeId, tenantId });
    await this.signerRepository.remove(signer);
  }

  async findByEnvelope(envelopeId: string, tenantId: string): Promise<Signer[]> {
    return this.signerRepository.find({
      where: { envelopeId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async searchPendingDocuments(
    tenantId: string,
    query: string,
  ): Promise<SignerPendingDocument[]> {
    return this.signerRepository
      .createQueryBuilder('signer')
      .innerJoin('envelopes', 'envelope', 'envelope.id = signer.envelope_id')
      .select([
        'signer.id AS "signerId"',
        'signer.name AS "signerName"',
        'signer.email AS "signerEmail"',
        'signer.cpf AS "signerCpf"',
        'signer.phone AS "signerPhone"',
        'signer.status AS "signerStatus"',
        'signer.access_token AS "accessToken"',
        'envelope.id AS "envelopeId"',
        'envelope.title AS "envelopeTitle"',
        'envelope.created_at AS "envelopeCreatedAt"',
        'envelope.expires_at AS "envelopeExpiresAt"',
      ])
      .where('signer.tenant_id = :tenantId', { tenantId })
      .andWhere('signer.status = :signerStatus', { signerStatus: SignerStatus.PENDING })
      .andWhere('envelope.status = :envelopeStatus', {
        envelopeStatus: EnvelopeStatus.PENDING_SIGNATURES,
      })
      .andWhere(
        '(signer.email ILIKE :q OR signer.cpf ILIKE :q OR signer.phone ILIKE :q)',
        { q: `%${query}%` },
      )
      .orderBy('envelope.created_at', 'DESC')
      .limit(50)
      .getRawMany();
  }

  async findByTenant(
    tenantId: string,
    query: ListSignersQueryDto,
  ): Promise<{
    data: Array<Signer & { envelopeTitle: string }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Signer> = { tenantId };
    if (query.status) {
      where.status = query.status;
    }

    const [signers, total] = await this.signerRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const envelopeIds = [...new Set(signers.map((s) => s.envelopeId))];
    const envelopeMap = new Map<string, string>();

    for (const envId of envelopeIds) {
      try {
        const env = await this.envelopesService.findOne(envId, tenantId);
        envelopeMap.set(env.id, env.title);
      } catch {
        envelopeMap.set(envId, '');
      }
    }

    const data = signers.map((signer) => ({
      ...signer,
      envelopeTitle: envelopeMap.get(signer.envelopeId) ?? '',
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByToken(accessToken: string): Promise<Signer> {
    return this.findSignerOrFail({ accessToken }, 'Signer or document not found');
  }

  async findByTokenWithEnvelope(accessToken: string): Promise<{
    signer: Signer;
    envelope: {
      id: string;
      title: string;
      status: EnvelopeStatus;
      signingLanguage: string;
      expiresAt: Date | null;
    };
    documents: Array<{ id: string; title: string; status: DocumentStatus; position: number }>;
  }> {
    const signer = await this.findByToken(accessToken);

    if (signer.viewedAt === null) {
      signer.viewedAt = new Date();
      await this.signerRepository.save(signer);
    }

    const envelope = await this.envelopesService.findOne(signer.envelopeId, signer.tenantId);
    const documents = await this.documentsService.findByEnvelope(envelope.id, signer.tenantId);

    return {
      signer,
      envelope: {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        signingLanguage: envelope.signingLanguage,
        expiresAt: envelope.expiresAt,
      },
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        position: d.position,
      })),
    };
  }

  async identifySigner(
    accessToken: string,
    dto: IdentifySignerDto,
  ): Promise<{ identified: true }> {
    const signer = await this.findByToken(accessToken);

    if (signer.requestEmail) {
      this.validateEmailField(dto.email, signer.email);
    }

    if (signer.requestCpf) {
      this.validateIdentityField(dto.cpf, signer.cpf, 'CPF');
      signer.cpf = signer.cpf ?? (dto.cpf as string);
    }

    if (signer.requestPhone) {
      this.validateIdentityField(dto.phone, signer.phone, 'Phone');
      signer.phone = signer.phone ?? (dto.phone as string);
    }

    await this.signerRepository.save(signer);
    return { identified: true };
  }

  private validateEmailField(inputValue: string | undefined, storedValue: string): void {
    if (!inputValue) {
      throw new BadRequestException('Email is required for this signer');
    }
    if (inputValue.toLowerCase() !== storedValue.toLowerCase()) {
      throw new BadRequestException('Email does not match');
    }
  }

  private validateIdentityField(
    inputValue: string | undefined,
    storedValue: string | null,
    fieldName: string,
  ): void {
    if (!inputValue) {
      throw new BadRequestException(`${fieldName} is required for this signer`);
    }
    const normalizedInput = inputValue.replaceAll(/\D/g, '');
    if (storedValue) {
      const normalizedStored = storedValue.replaceAll(/\D/g, '');
      if (normalizedInput !== normalizedStored) {
        throw new BadRequestException(`${fieldName} does not match`);
      }
    }
  }

  private async findSignerOrFail(
    where: FindOptionsWhere<Signer>,
    message = 'Signer not found',
  ): Promise<Signer> {
    const signer = await this.signerRepository.findOne({ where });
    if (signer === null) {
      throw new NotFoundException(message);
    }
    return signer;
  }
}
