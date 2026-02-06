import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { Tenant } from '../entities/tenant.entity';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { sha256 } from '@connexto/shared';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly usersService: UsersService
  ) {}

  async create(
    createTenantDto: CreateTenantDto
  ): Promise<Tenant & { apiKey?: string; ownerPassword?: string }> {
    const tenant = this.tenantRepository.create(createTenantDto);
    const rawApiKey = `sk_${randomBytes(32).toString('hex')}`;
    tenant.apiKeyHash = sha256(Buffer.from(rawApiKey, 'utf-8'));
    const saved = await this.tenantRepository.save(tenant);
    const ownerPassword = `pw_${randomBytes(12).toString('hex')}`;
    await this.usersService.createOwner(
      saved.id,
      createTenantDto.ownerEmail,
      createTenantDto.ownerName,
      ownerPassword
    );
    return { ...saved, apiKey: rawApiKey, ownerPassword };
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
}
