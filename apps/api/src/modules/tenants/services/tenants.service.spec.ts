import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { sha256 } from '@connexto/shared';
import * as crypto from 'node:crypto';
import { UsersService } from '../../users/services/users.service';

jest.mock('node:crypto', () => {
  const actual = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, randomBytes: jest.fn() };
});

const buildTenant = (overrides?: Partial<Tenant>): Tenant => ({
  id: 'tenant-1',
  name: 'Acme',
  slug: 'acme',
  branding: null,
  legalTexts: null,
  usageLimits: null,
  apiKeyHash: null,
  isActive: true,
  certificateFileKey: null,
  certificatePasswordEnc: null,
  certificateSubject: null,
  certificateIssuer: null,
  certificateExpiresAt: null,
  certificateConfiguredAt: null,
  defaultSigningLanguage: 'pt-br',
  defaultReminderInterval: 'none',
  defaultClosureMode: 'automatic',
  emailSenderName: null,
  apiKeyLastFour: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantRepository: Repository<Tenant>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    tenantRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as Repository<Tenant>;
    usersService = {
      create: jest.fn(),
      createOwner: jest.fn(),
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      findByTenantId: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
    service = new TenantsService(tenantRepository, usersService, eventEmitter);
  });

  describe('create', () => {
    test('should save tenant and return apiKey', async () => {
      jest
        .mocked(crypto.randomBytes)
        .mockImplementation((size: number) => Buffer.from('a'.repeat(size)));
      const created = buildTenant({ apiKeyHash: 'hash' });
      const saved = buildTenant({ id: 'tenant-2', apiKeyHash: 'hash' });
      (tenantRepository.create as jest.Mock).mockReturnValue(created);
      (tenantRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create({
        name: 'Acme',
        slug: 'acme',
        ownerName: 'Owner',
        ownerEmail: 'owner@acme.com',
        ownerPassword: 'strong-password',
      });

      const rawApiKey = `sk_${Buffer.from('a'.repeat(32)).toString('hex')}`;
      expect(created.apiKeyHash).toBe(sha256(Buffer.from(rawApiKey, 'utf-8')));
      expect(result.id).toBe('tenant-2');
      expect(usersService.createOwner).toHaveBeenCalledWith(
        'tenant-2',
        'owner@acme.com',
        'Owner',
        'strong-password'
      );
    });
  });

  describe('findOne', () => {
    test('should throw when scope does not match', async () => {
      await expect(service.findOne('tenant-1', 'tenant-2')).rejects.toThrow(NotFoundException);
    });

    test('should throw when tenant not found', async () => {
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('tenant-1')).rejects.toThrow(NotFoundException);
    });

    test('should return tenant when found', async () => {
      const tenant = buildTenant();
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(tenant);
      await expect(service.findOne('tenant-1')).resolves.toEqual(tenant);
    });
  });

  describe('findBySlug', () => {
    test('should return tenant when found', async () => {
      const tenant = buildTenant();
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(tenant);
      await expect(service.findBySlug('acme')).resolves.toEqual(tenant);
    });
  });

  describe('update', () => {
    test('should update tenant', async () => {
      const tenant = buildTenant();
      jest.spyOn(service, 'findOne').mockResolvedValue(tenant);
      (tenantRepository.save as jest.Mock).mockResolvedValue({
        ...tenant,
        name: 'Updated',
      });

      const result = await service.update('tenant-1', { name: 'Updated' }, 'tenant-1');

      expect(result.name).toBe('Updated');
    });
  });

  describe('validateApiKey', () => {
    test('should return null when not found', async () => {
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.validateApiKey('key')).resolves.toBeNull();
    });

    test('should return tenantId when found', async () => {
      const tenant = buildTenant({ id: 'tenant-9', apiKeyHash: 'hash', isActive: true });
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(tenant);

      const result = await service.validateApiKey('key');

      expect(result).toEqual({ tenantId: 'tenant-9' });
    });
  });
});
