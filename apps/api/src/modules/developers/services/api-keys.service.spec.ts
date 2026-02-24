import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '../entities/api-key.entity';

const mockRepository = () => ({
  count: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn((entity: unknown) => Promise.resolve({ ...(entity as object), id: 'key-1' })),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    repo = mockRepository();
    const module = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: getRepositoryToken(ApiKey), useValue: repo },
      ],
    }).compile();
    service = module.get(ApiKeysService);
  });

  describe('create', () => {
    test('should create an API key with valid data', async () => {
      repo.count.mockResolvedValue(0);
      const result = await service.create('tenant-1', {
        name: 'Production',
        scopes: ['documents:read'],
      });

      expect(result.rawKey).toMatch(/^sk_live_[a-f0-9]{64}$/);
      expect(result.apiKey.tenantId).toBe('tenant-1');
      expect(result.apiKey.name).toBe('Production');
      expect(repo.save).toHaveBeenCalled();
    });

    test('should reject when max keys reached', async () => {
      repo.count.mockResolvedValue(10);
      await expect(
        service.create('tenant-1', { name: 'Too many', scopes: ['documents:read'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByTenant', () => {
    test('should return active keys ordered by creation date', async () => {
      const keys = [{ id: 'k1' }, { id: 'k2' }];
      repo.find.mockResolvedValue(keys);
      const result = await service.findAllByTenant('tenant-1');
      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('revoke', () => {
    test('should deactivate an existing key', async () => {
      const key = { id: 'k1', isActive: true, revokedAt: null };
      repo.findOne.mockResolvedValue(key);
      await service.revoke('k1', 'tenant-1');
      expect(key.isActive).toBe(false);
      expect(key.revokedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(key);
    });

    test('should throw NotFoundException for unknown key', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.revoke('unknown', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    test('should return tenant and key info for valid key', async () => {
      const key = {
        id: 'k1',
        tenantId: 'tenant-1',
        isActive: true,
        expiresAt: null,
        scopes: ['documents:read'],
      };
      repo.findOne.mockResolvedValue(key);
      const result = await service.validate('sk_live_abc');
      expect(result).toEqual({
        tenantId: 'tenant-1',
        apiKeyId: 'k1',
        scopes: ['documents:read'],
      });
    });

    test('should return null for expired key', async () => {
      const key = {
        id: 'k1',
        tenantId: 'tenant-1',
        isActive: true,
        expiresAt: new Date('2020-01-01'),
        scopes: ['documents:read'],
      };
      repo.findOne.mockResolvedValue(key);
      const result = await service.validate('sk_live_expired');
      expect(result).toBeNull();
    });

    test('should return null for non-existent key', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.validate('sk_live_invalid');
      expect(result).toBeNull();
    });
  });

  describe('incrementUsage', () => {
    test('should update lastUsedAt and increment totalRequests', async () => {
      await service.incrementUsage('k1');
      expect(repo.update).toHaveBeenCalledWith('k1', {
        lastUsedAt: expect.any(Date),
        totalRequests: expect.any(Function),
      });
    });
  });
});
