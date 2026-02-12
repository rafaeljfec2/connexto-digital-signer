import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TenantSigner } from '../entities/tenant-signer.entity';
import type { CreateTenantSignerDto } from '../dto/create-tenant-signer.dto';
import type { UpdateTenantSignerDto } from '../dto/update-tenant-signer.dto';
import type { ListTenantSignersQueryDto } from '../dto/list-tenant-signers-query.dto';

interface FindOrCreateInput {
  readonly name: string;
  readonly email: string;
  readonly cpf?: string;
  readonly phone?: string;
  readonly birthDate?: string;
}

@Injectable()
export class TenantSignerService {
  private readonly logger = new Logger(TenantSignerService.name);

  constructor(
    @InjectRepository(TenantSigner)
    private readonly repository: Repository<TenantSigner>,
  ) {}

  async findOrCreate(
    tenantId: string,
    data: FindOrCreateInput,
  ): Promise<TenantSigner> {
    const emailLower = data.email.toLowerCase();

    const byEmail = await this.repository.findOne({
      where: { tenantId, email: ILike(emailLower) },
    });

    if (byEmail) {
      if (
        data.cpf &&
        byEmail.cpf &&
        byEmail.cpf !== data.cpf
      ) {
        throw new ConflictException(
          `A signer with email "${data.email}" already exists with a different CPF`,
        );
      }
      return this.mergeFields(byEmail, data);
    }

    if (data.cpf) {
      const byCpf = await this.repository.findOne({
        where: { tenantId, cpf: data.cpf },
      });

      if (byCpf) {
        if (byCpf.email.toLowerCase() !== emailLower) {
          throw new ConflictException(
            `A signer with CPF "${data.cpf}" already exists with a different email`,
          );
        }
        return this.mergeFields(byCpf, data);
      }
    }

    const entity = this.repository.create({
      tenantId,
      name: data.name,
      email: data.email,
      cpf: data.cpf ?? null,
      phone: data.phone ?? null,
      birthDate: data.birthDate ?? null,
    });

    const saved = await this.repository.save(entity);
    this.logger.log(
      `Created tenant signer ${saved.id} for tenant ${tenantId}`,
    );
    return saved;
  }

  async search(
    tenantId: string,
    query: string,
  ): Promise<TenantSigner[]> {
    if (!query.trim()) return [];

    const pattern = `%${query.trim()}%`;

    return this.repository
      .createQueryBuilder('ts')
      .where('ts.tenant_id = :tenantId', { tenantId })
      .andWhere('(ts.name ILIKE :pattern OR ts.email ILIKE :pattern)', {
        pattern,
      })
      .orderBy('ts.name', 'ASC')
      .limit(10)
      .getMany();
  }

  async findAll(
    tenantId: string,
    query: ListTenantSignersQueryDto,
  ): Promise<{
    data: TenantSigner[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { tenantId },
      order: { name: 'ASC' },
      skip,
      take: limit,
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

  async findOne(tenantId: string, id: string): Promise<TenantSigner> {
    const entity = await this.repository.findOne({
      where: { id, tenantId },
    });
    if (!entity) {
      throw new NotFoundException(`Tenant signer ${id} not found`);
    }
    return entity;
  }

  async create(
    tenantId: string,
    dto: CreateTenantSignerDto,
  ): Promise<TenantSigner> {
    return this.findOrCreate(tenantId, dto);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTenantSignerDto,
  ): Promise<TenantSigner> {
    const entity = await this.findOne(tenantId, id);

    if (dto.email && dto.email.toLowerCase() !== entity.email.toLowerCase()) {
      const existing = await this.repository.findOne({
        where: { tenantId, email: ILike(dto.email.toLowerCase()) },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A signer with email "${dto.email}" already exists`,
        );
      }
    }

    if (dto.cpf && dto.cpf !== entity.cpf) {
      const existing = await this.repository.findOne({
        where: { tenantId, cpf: dto.cpf },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A signer with CPF "${dto.cpf}" already exists`,
        );
      }
    }

    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const entity = await this.findOne(tenantId, id);
    await this.repository.remove(entity);
  }

  private async mergeFields(
    existing: TenantSigner,
    data: FindOrCreateInput,
  ): Promise<TenantSigner> {
    let updated = false;

    if (!existing.cpf && data.cpf) {
      existing.cpf = data.cpf;
      updated = true;
    }
    if (!existing.phone && data.phone) {
      existing.phone = data.phone;
      updated = true;
    }
    if (!existing.birthDate && data.birthDate) {
      existing.birthDate = data.birthDate;
      updated = true;
    }
    if (data.name && data.name !== existing.name) {
      existing.name = data.name;
      updated = true;
    }

    if (updated) {
      return this.repository.save(existing);
    }

    return existing;
  }
}
