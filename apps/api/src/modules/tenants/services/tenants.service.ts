import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryFailedError, Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { sha256 } from '@connexto/shared';
import { EVENT_TENANT_CREATED } from '@connexto/events';
import type { TenantCreatedEvent } from '@connexto/events';
import { UsersService } from '../../users/services/users.service';

const MAX_SLUG_SUFFIX = 50;
const OWNER_EMAIL_TAKEN_MESSAGE = 'Owner email already registered';
const TENANT_SLUG_TAKEN_MESSAGE = 'Tenant slug already exists';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const { ownerEmail, ownerName, ownerPassword, ...tenantData } = createTenantDto;

    const existingOwner = await this.usersService.findByEmail(ownerEmail);
    if (existingOwner !== null) {
      throw new ConflictException(OWNER_EMAIL_TAKEN_MESSAGE);
    }

    const tenant = this.tenantRepository.create(tenantData);
    tenant.slug = await this.resolveUniqueSlug(tenantData.slug);
    const rawApiKey = `sk_${randomBytes(32).toString('hex')}`;
    tenant.apiKeyHash = sha256(Buffer.from(rawApiKey, 'utf-8'));
    tenant.apiKeyLastFour = rawApiKey.slice(-4);

    try {
      const saved = await this.tenantRepository.save(tenant);
      await this.usersService.createOwner(
        saved.id,
        ownerEmail,
        ownerName,
        ownerPassword,
      );

      const eventPayload: TenantCreatedEvent = {
        tenantId: saved.id,
        ownerEmail,
        ownerName,
        createdAt: new Date(),
      };
      this.eventEmitter.emit(EVENT_TENANT_CREATED, eventPayload);

      return saved;
    } catch (error) {
      this.rethrowUniqueViolation(error);
    }
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    if ((await this.findBySlug(baseSlug)) === null) {
      return baseSlug;
    }
    for (let suffix = 2; suffix <= MAX_SLUG_SUFFIX + 1; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;
      if ((await this.findBySlug(candidate)) === null) {
        return candidate;
      }
    }
    throw new ConflictException(TENANT_SLUG_TAKEN_MESSAGE);
  }

  private rethrowUniqueViolation(error: unknown): never {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    const detail = getQueryFailedDetail(error).toLowerCase();
    if (detail.includes('email')) {
      throw new ConflictException(OWNER_EMAIL_TAKEN_MESSAGE);
    }
    throw new ConflictException(TENANT_SLUG_TAKEN_MESSAGE);
  }

  async findOne(id: string, scopeToTenantId?: string): Promise<Tenant> {
    if (scopeToTenantId !== undefined && scopeToTenantId !== id) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (tenant === null) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, scopeToTenantId?: string): Promise<Tenant> {
    const tenant = await this.findOne(id, scopeToTenantId);
    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async validateApiKey(apiKey: string): Promise<{ tenantId: string } | null> {
    const hash = sha256(Buffer.from(apiKey, 'utf-8'));
    const tenant = await this.tenantRepository.findOne({
      where: { apiKeyHash: hash, isActive: true },
    });
    if (tenant === null) return null;
    return { tenantId: tenant.id };
  }

  async updatePartial(id: string, fields: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findOne(id, id);
    Object.assign(tenant, fields);
    return this.tenantRepository.save(tenant);
  }

  async regenerateApiKey(tenantId: string): Promise<string> {
    const tenant = await this.findOne(tenantId, tenantId);
    const rawApiKey = `sk_${randomBytes(32).toString('hex')}`;
    tenant.apiKeyHash = sha256(Buffer.from(rawApiKey, 'utf-8'));
    tenant.apiKeyLastFour = rawApiKey.slice(-4);
    await this.tenantRepository.save(tenant);
    return rawApiKey;
  }
}

function isUniqueViolation(error: unknown): error is QueryFailedError {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  return (error as { code?: string }).code === '23505';
}

function getQueryFailedDetail(error: QueryFailedError): string {
  return (error as { detail?: string }).detail ?? '';
}
