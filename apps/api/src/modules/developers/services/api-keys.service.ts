import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { sha256 } from '@connexto/shared';
import { ApiKey, type ApiKeyScope } from '../entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';

const MAX_KEYS_PER_TENANT = 10;

export interface ApiKeyValidationResult {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(
    tenantId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const count = await this.apiKeyRepository.count({
      where: { tenantId, isActive: true },
    });
    if (count >= MAX_KEYS_PER_TENANT) {
      throw new BadRequestException(
        `Maximum of ${MAX_KEYS_PER_TENANT} active API keys per tenant`,
      );
    }

    const rawKey = `sk_live_${randomBytes(32).toString('hex')}`;
    const keyHash = sha256(Buffer.from(rawKey, 'utf-8'));
    const keyLastFour = rawKey.slice(-4);

    const apiKey = this.apiKeyRepository.create({
      tenantId,
      name: dto.name,
      keyHash,
      keyPrefix: 'sk_live_',
      keyLastFour,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);
    return { apiKey: saved, rawKey };
  }

  async findAllByTenant(tenantId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, tenantId: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({
      where: { id, tenantId, isActive: true },
    });
    if (key === null) {
      throw new NotFoundException('API key not found');
    }
    key.isActive = false;
    key.revokedAt = new Date();
    await this.apiKeyRepository.save(key);
  }

  async validate(rawKey: string): Promise<ApiKeyValidationResult | null> {
    const hash = sha256(Buffer.from(rawKey, 'utf-8'));
    const key = await this.apiKeyRepository.findOne({
      where: { keyHash: hash, isActive: true },
    });
    if (key === null) return null;

    if (key.expiresAt !== null && key.expiresAt < new Date()) {
      return null;
    }

    return {
      tenantId: key.tenantId,
      apiKeyId: key.id,
      scopes: key.scopes,
    };
  }

  async incrementUsage(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, {
      lastUsedAt: new Date(),
      totalRequests: () => '"total_requests" + 1',
    });
  }

  async hasScope(apiKeyId: string, scope: ApiKeyScope): Promise<boolean> {
    const key = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, isActive: true },
    });
    if (key === null) return false;
    return key.scopes.includes(scope);
  }

  async migrateFromTenant(
    tenantId: string,
    legacyKeyHash: string,
    legacyLastFour: string,
  ): Promise<void> {
    const exists = await this.apiKeyRepository.findOne({
      where: { tenantId, keyHash: legacyKeyHash },
    });
    if (exists !== null) return;

    const apiKey = this.apiKeyRepository.create({
      tenantId,
      name: 'Legacy API Key',
      keyHash: legacyKeyHash,
      keyPrefix: 'sk_',
      keyLastFour: legacyLastFour,
      scopes: [
        'documents:read',
        'documents:write',
        'webhooks:manage',
        'templates:read',
        'templates:write',
        'signers:manage',
        'envelopes:read',
        'envelopes:write',
      ],
    });
    await this.apiKeyRepository.save(apiKey);
  }
}
