import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { SignatureFieldsService } from './signature-fields.service';
import { SignatureField, SignatureFieldType } from '../entities/signature-field.entity';

const buildField = (overrides?: Partial<SignatureField>): SignatureField => ({
  id: 'field-1',
  tenantId: 'tenant-1',
  documentId: 'doc-1',
  signerId: 'signer-1',
  type: SignatureFieldType.SIGNATURE,
  page: 1,
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
  required: true,
  value: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('SignatureFieldsService', () => {
  let service: SignatureFieldsService;
  let repository: Repository<SignatureField>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as Repository<SignatureField>;
    service = new SignatureFieldsService(repository);
  });

  test('create should persist field', async () => {
    const created = buildField();
    (repository.create as jest.Mock).mockReturnValue(created);
    (repository.save as jest.Mock).mockResolvedValue(created);

    const result = await service.create('tenant-1', 'doc-1', {
      signerId: 'signer-1',
      type: SignatureFieldType.SIGNATURE,
      page: 1,
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.1,
      required: true,
    });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  test('update should throw when field not found', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      service.update('tenant-1', 'doc-1', 'field-1', { x: 0.2 })
    ).rejects.toThrow(NotFoundException);
  });

  test('remove should throw when delete affects no rows', async () => {
    (repository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

    await expect(service.remove('tenant-1', 'doc-1', 'field-1')).rejects.toThrow(
      NotFoundException
    );
  });

  test('replaceAll should replace fields', async () => {
    const saved = [buildField({ id: 'field-2' })];
    (repository.save as jest.Mock).mockResolvedValue(saved);

    const result = await service.replaceAll('tenant-1', 'doc-1', {
      fields: [
        {
          signerId: 'signer-1',
          type: SignatureFieldType.NAME,
          page: 1,
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.1,
          required: true,
        },
      ],
    });

    expect(result).toEqual(saved);
    expect(repository.delete).toHaveBeenCalledWith({ tenantId: 'tenant-1', documentId: 'doc-1' });
    expect(repository.save).toHaveBeenCalled();
  });
});
