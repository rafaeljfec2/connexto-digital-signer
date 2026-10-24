import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';
import { sha256 } from '@connexto/shared';
import * as crypto from 'node:crypto';
import { UsersService } from '../../users/services/users.service';
import { User, UserRole } from '../../users/entities/user.entity';

const buildUniqueViolation = (detail: string): QueryFailedError =>
  Object.assign(new QueryFailedError('', [], new Error('unique violation')), {
    code: '23505',
    detail,
  });

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
    test('should save tenant with free slug unchanged', async () => {
      jest
        .mocked(crypto.randomBytes)
        .mockImplementation((size: number) => Buffer.from('a'.repeat(size)));
      const created = buildTenant({ apiKeyHash: 'hash' });
      const saved = buildTenant({ id: 'tenant-2', apiKeyHash: 'hash' });
      usersService.findByEmail.mockResolvedValue(null);
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(null);
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
      expect(created.slug).toBe('acme');
      expect(created.apiKeyHash).toBe(sha256(Buffer.from(rawApiKey, 'utf-8')));
      expect(result.id).toBe('tenant-2');
      expect(usersService.createOwner).toHaveBeenCalledWith(
        'tenant-2',
        'owner@acme.com',
        'Owner',
        'strong-password'
      );
    });

    test('should append numeric suffix when slug is taken', async () => {
      jest
        .mocked(crypto.randomBytes)
        .mockImplementation((size: number) => Buffer.from('a'.repeat(size)));
      const created = buildTenant({ apiKeyHash: 'hash', slug: 'acme' });
      const saved = buildTenant({ id: 'tenant-2', apiKeyHash: 'hash', slug: 'acme-2' });
      usersService.findByEmail.mockResolvedValue(null);
      (tenantRepository.findOne as jest.Mock).mockImplementation(
        ({ where }: { where: { slug: string } }) => {
          if (where.slug === 'acme') {
            return Promise.resolve(buildTenant({ slug: 'acme' }));
          }
          return Promise.resolve(null);
        }
      );
      (tenantRepository.create as jest.Mock).mockReturnValue(created);
      (tenantRepository.save as jest.Mock).mockResolvedValue(saved);

      await service.create({
        name: 'Acme',
        slug: 'acme',
        ownerName: 'Owner',
        ownerEmail: 'owner@acme.com',
        ownerPassword: 'strong-password',
      });

      expect(created.slug).toBe('acme-2');
    });

    test('should throw ConflictException when owner email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'owner@acme.com',
        name: 'Existing',
        role: UserRole.OWNER,
        tenantId: 'other-tenant',
        passwordHash: 'hash',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User);

      await expect(
        service.create({
          name: 'Acme',
          slug: 'acme',
          ownerName: 'Owner',
          ownerEmail: 'owner@acme.com',
          ownerPassword: 'strong-password',
        })
      ).rejects.toThrow(new ConflictException('Owner email already registered'));
      expect(tenantRepository.save).not.toHaveBeenCalled();
    });

    test('should map slug unique violation on save to ConflictException', async () => {
      jest
        .mocked(crypto.randomBytes)
        .mockImplementation((size: number) => Buffer.from('a'.repeat(size)));
      const created = buildTenant({ apiKeyHash: 'hash' });
      usersService.findByEmail.mockResolvedValue(null);
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(null);
      (tenantRepository.create as jest.Mock).mockReturnValue(created);
      (tenantRepository.save as jest.Mock).mockRejectedValue(
        buildUniqueViolation('Key (slug)=(acme) already exists.')
      );

      await expect(
        service.create({
          name: 'Acme',
          slug: 'acme',
          ownerName: 'Owner',
          ownerEmail: 'owner@acme.com',
          ownerPassword: 'strong-password',
        })
      ).rejects.toThrow(new ConflictException('Tenant slug already exists'));
    });

    test('should map email unique violation on createOwner to ConflictException', async () => {
      jest
        .mocked(crypto.randomBytes)
        .mockImplementation((size: number) => Buffer.from('a'.repeat(size)));
      const created = buildTenant({ apiKeyHash: 'hash' });
      const saved = buildTenant({ id: 'tenant-2', apiKeyHash: 'hash' });
      usersService.findByEmail.mockResolvedValue(null);
      (tenantRepository.findOne as jest.Mock).mockResolvedValue(null);
      (tenantRepository.create as jest.Mock).mockReturnValue(created);
      (tenantRepository.save as jest.Mock).mockResolvedValue(saved);
      usersService.createOwner.mockRejectedValue(
        buildUniqueViolation('Key (email)=(owner@acme.com) already exists.')
      );

      await expect(
        service.create({
          name: 'Acme',
          slug: 'acme',
          ownerName: 'Owner',
          ownerEmail: 'owner@acme.com',
          ownerPassword: 'strong-password',
        })
      ).rejects.toThrow(new ConflictException('Owner email already registered'));
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
