import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TenantSignerService } from './tenant-signer.service';
import { TenantSigner } from '../entities/tenant-signer.entity';

const buildTenantSigner = (overrides?: Partial<TenantSigner>): TenantSigner => ({
  id: 'ts-1',
  tenantId: 'tenant-1',
  name: 'Jane Doe',
  email: 'jane@acme.com',
  cpf: null,
  phone: null,
  birthDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('TenantSignerService', () => {
  let service: TenantSignerService;
  let repository: jest.Mocked<Repository<TenantSigner>>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<TenantSigner>>;

    service = new TenantSignerService(repository);
  });

  describe('findOrCreate', () => {
    test('should create new tenant signer when no match found', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = buildTenantSigner();
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.findOrCreate('tenant-1', {
        name: 'Jane Doe',
        email: 'jane@acme.com',
      });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        name: 'Jane Doe',
        email: 'jane@acme.com',
        cpf: null,
        phone: null,
        birthDate: null,
      });
    });

    test('should return existing signer when email matches', async () => {
      const existing = buildTenantSigner();
      repository.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreate('tenant-1', {
        name: 'Jane Doe',
        email: 'jane@acme.com',
      });

      expect(result).toEqual(existing);
      expect(repository.create).not.toHaveBeenCalled();
    });

    test('should merge missing fields when email matches', async () => {
      const existing = buildTenantSigner({ phone: null });
      const updated = buildTenantSigner({ phone: '+5511999' });
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      const result = await service.findOrCreate('tenant-1', {
        name: 'Jane Doe',
        email: 'jane@acme.com',
        phone: '+5511999',
      });

      expect(result).toEqual(updated);
      expect(repository.save).toHaveBeenCalled();
    });

    test('should throw ConflictException when email matches but CPF differs', async () => {
      const existing = buildTenantSigner({ cpf: '111.222.333-44' });
      repository.findOne.mockResolvedValue(existing);

      await expect(
        service.findOrCreate('tenant-1', {
          name: 'Jane Doe',
          email: 'jane@acme.com',
          cpf: '555.666.777-88',
        }),
      ).rejects.toThrow(ConflictException);
    });

    test('should throw ConflictException when CPF matches but email differs', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          buildTenantSigner({ email: 'other@acme.com', cpf: '111.222.333-44' }),
        );

      await expect(
        service.findOrCreate('tenant-1', {
          name: 'Jane Doe',
          email: 'jane@acme.com',
          cpf: '111.222.333-44',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('search', () => {
    test('should return empty array for empty query', async () => {
      const result = await service.search('tenant-1', '');
      expect(result).toEqual([]);
    });

    test('should call query builder with ILIKE pattern', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([buildTenantSigner()]),
      };
      repository.createQueryBuilder.mockReturnValue(qb as never);

      const result = await service.search('tenant-1', 'jane');

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(ts.name ILIKE :pattern OR ts.email ILIKE :pattern)',
        { pattern: '%jane%' },
      );
    });
  });

  describe('findAll', () => {
    test('should return paginated results', async () => {
      const contacts = [buildTenantSigner()];
      repository.findAndCount.mockResolvedValue([contacts, 1]);

      const result = await service.findAll('tenant-1', { page: 1, limit: 10 });

      expect(result.data).toEqual(contacts);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    test('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('tenant-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    test('should return entity when found', async () => {
      const entity = buildTenantSigner();
      repository.findOne.mockResolvedValue(entity);

      const result = await service.findOne('tenant-1', 'ts-1');
      expect(result).toEqual(entity);
    });
  });

  describe('update', () => {
    test('should update and return entity', async () => {
      const existing = buildTenantSigner();
      const updated = buildTenantSigner({ name: 'Jane Updated' });
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      const result = await service.update('tenant-1', 'ts-1', {
        name: 'Jane Updated',
      });

      expect(result.name).toBe('Jane Updated');
    });

    test('should throw ConflictException when email conflicts with another contact', async () => {
      const existing = buildTenantSigner({ id: 'ts-1' });
      const conflicting = buildTenantSigner({ id: 'ts-2', email: 'other@acme.com' });
      repository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(conflicting);

      await expect(
        service.update('tenant-1', 'ts-1', { email: 'other@acme.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    test('should remove entity', async () => {
      const entity = buildTenantSigner();
      repository.findOne.mockResolvedValue(entity);
      repository.remove.mockResolvedValue(entity);

      await service.remove('tenant-1', 'ts-1');

      expect(repository.remove).toHaveBeenCalledWith(entity);
    });

    test('should throw NotFoundException when entity does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('tenant-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
