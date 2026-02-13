import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { Envelope, EnvelopeStatus } from '../entities/envelope.entity';
import { CreateEnvelopeDto } from '../dto/create-envelope.dto';
import { UpdateEnvelopeDto } from '../dto/update-envelope.dto';
import { ListEnvelopesQueryDto } from '../dto/list-envelopes-query.dto';
import { FoldersService } from '../../folders/services/folders.service';
import { TenantsService } from '../../tenants/services/tenants.service';

@Injectable()
export class EnvelopesService {
  private readonly logger = new Logger(EnvelopesService.name);

  constructor(
    @InjectRepository(Envelope)
    private readonly envelopeRepository: Repository<Envelope>,
    private readonly foldersService: FoldersService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(tenantId: string, dto: CreateEnvelopeDto): Promise<Envelope> {
    await this.foldersService.findOne(dto.folderId, tenantId);

    const tenant = await this.tenantsService.findOne(tenantId, tenantId);

    const envelope = this.envelopeRepository.create({
      tenantId,
      folderId: dto.folderId,
      title: dto.title,
      signingMode: dto.signingMode,
      signingLanguage: dto.signingLanguage ?? tenant.defaultSigningLanguage ?? 'pt-br',
      reminderInterval: dto.reminderInterval ?? tenant.defaultReminderInterval ?? 'none',
      closureMode: dto.closureMode ?? tenant.defaultClosureMode ?? 'automatic',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      status: EnvelopeStatus.DRAFT,
    });

    return this.envelopeRepository.save(envelope);
  }

  async findOne(id: string, tenantId: string): Promise<Envelope> {
    const envelope = await this.envelopeRepository.findOne({
      where: { id, tenantId },
    });
    if (envelope === null) {
      throw new NotFoundException(`Envelope ${id} not found`);
    }
    return envelope;
  }

  async findAll(
    tenantId: string,
    query: ListEnvelopesQueryDto,
  ): Promise<{
    data: Envelope[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Envelope> = { tenantId };
    if (query.status) where.status = query.status;
    if (query.folderId) where.folderId = query.folderId;

    const [data, total] = await this.envelopeRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

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

  async getStats(tenantId: string): Promise<{
    pending: number;
    completed: number;
    expired: number;
    draft: number;
    total: number;
  }> {
    const [pending, completed, expired, draft, total] = await Promise.all([
      this.envelopeRepository.count({
        where: { tenantId, status: EnvelopeStatus.PENDING_SIGNATURES },
      }),
      this.envelopeRepository.count({
        where: { tenantId, status: EnvelopeStatus.COMPLETED },
      }),
      this.envelopeRepository.count({
        where: { tenantId, status: EnvelopeStatus.EXPIRED },
      }),
      this.envelopeRepository.count({
        where: { tenantId, status: EnvelopeStatus.DRAFT },
      }),
      this.envelopeRepository.count({ where: { tenantId } }),
    ]);
    return { pending, completed, expired, draft, total };
  }

  async update(id: string, tenantId: string, dto: UpdateEnvelopeDto): Promise<Envelope> {
    const envelope = await this.findOne(id, tenantId);

    if (dto.title !== undefined) envelope.title = dto.title;
    if (dto.signingMode !== undefined) envelope.signingMode = dto.signingMode;
    if (dto.signingLanguage !== undefined) envelope.signingLanguage = dto.signingLanguage;
    if (dto.reminderInterval !== undefined) envelope.reminderInterval = dto.reminderInterval;
    if (dto.closureMode !== undefined) envelope.closureMode = dto.closureMode;
    if (dto.expiresAt !== undefined) {
      envelope.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.folderId !== undefined) {
      await this.foldersService.findOne(dto.folderId, tenantId);
      envelope.folderId = dto.folderId;
    }

    return this.envelopeRepository.save(envelope);
  }

  async setStatus(id: string, tenantId: string, status: EnvelopeStatus): Promise<Envelope> {
    const envelope = await this.findOne(id, tenantId);
    envelope.status = status;
    return this.envelopeRepository.save(envelope);
  }

  async deleteDraft(id: string, tenantId: string): Promise<void> {
    const envelope = await this.findOne(id, tenantId);
    if (envelope.status !== EnvelopeStatus.DRAFT) {
      throw new BadRequestException('Only draft envelopes can be deleted');
    }
    await this.envelopeRepository.remove(envelope);
  }
}
