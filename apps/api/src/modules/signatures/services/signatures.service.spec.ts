import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { Signer } from '../entities/signer.entity';
import { buildDocument, buildEnvelope, buildSigner } from './signatures-test.fixtures';
import { SignaturesService } from './signatures.service';
import { TenantSignerService } from './tenant-signer.service';

describe('SignaturesService', () => {
  let service: SignaturesService;
  let signerRepository: Repository<Signer>;
  let documentsService: jest.Mocked<DocumentsService>;
  let envelopesService: jest.Mocked<EnvelopesService>;
  let tenantSignerService: jest.Mocked<TenantSignerService>;

  beforeEach(() => {
    signerRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as Repository<Signer>;
    documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocument()]),
    } as unknown as jest.Mocked<DocumentsService>;
    envelopesService = {
      findOne: jest.fn().mockResolvedValue(buildEnvelope()),
    } as unknown as jest.Mocked<EnvelopesService>;
    tenantSignerService = {
      findOrCreate: jest.fn().mockResolvedValue({ id: 'ts-1' }),
    } as unknown as jest.Mocked<TenantSignerService>;
    service = new SignaturesService(
      signerRepository,
      documentsService,
      envelopesService,
      tenantSignerService,
    );
  });

  describe('addSigner', () => {
    test('should create signer, link to tenant signer and return saved signer', async () => {
      const envelope = buildEnvelope();
      const created = buildSigner({ accessToken: 'token-generated', tenantSignerId: 'ts-1' });
      const saved = buildSigner({
        id: 'signer-2',
        accessToken: 'token-generated',
        tenantSignerId: 'ts-1',
      });
      envelopesService.findOne.mockResolvedValue(envelope);
      tenantSignerService.findOrCreate.mockResolvedValue({ id: 'ts-1' } as never);
      (signerRepository.create as jest.Mock).mockReturnValue(created);
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      const result = await service.addSigner('tenant-1', 'env-1', {
        name: 'Jane',
        email: 'jane@acme.com',
      });

      expect(result).toEqual(saved);
      expect(tenantSignerService.findOrCreate).toHaveBeenCalledWith('tenant-1', {
        name: 'Jane',
        email: 'jane@acme.com',
        cpf: undefined,
        phone: undefined,
        birthDate: undefined,
      });
      expect(envelopesService.findOne).toHaveBeenCalledWith('env-1', 'tenant-1');
      expect(signerRepository.create).toHaveBeenCalled();
      expect(signerRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('findByToken', () => {
    test('should throw NotFoundException when signer does not exist', async () => {
      (signerRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findByToken('token-x')).rejects.toThrow(NotFoundException);
    });

    test('should return signer when found', async () => {
      const signer = buildSigner();
      (signerRepository.findOne as jest.Mock).mockResolvedValue(signer);
      await expect(service.findByToken('token-x')).resolves.toEqual(signer);
    });
  });
});
