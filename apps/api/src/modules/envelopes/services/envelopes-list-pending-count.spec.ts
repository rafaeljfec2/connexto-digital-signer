import type { Repository, SelectQueryBuilder } from 'typeorm';
import { EnvelopesService } from './envelopes.service';
import { Envelope, EnvelopeStatus, SigningMode } from '../entities/envelope.entity';
import { FoldersService } from '../../folders/services/folders.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('EnvelopesService.findAll pendingSignerCount', () => {
  test('should map pendingSignerCount from query raw results', async () => {
    const envelope = {
      id: 'env-1',
      tenantId: 'tenant-1',
      folderId: 'folder-1',
      title: 'Contract',
      status: EnvelopeStatus.PENDING_SIGNATURES,
      signingMode: SigningMode.PARALLEL,
      expiresAt: null,
      reminderInterval: 'none',
      signingLanguage: 'pt-br',
      closureMode: 'automatic',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies Envelope;

    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [envelope],
        raw: [{ documentCount: '2', pendingSignerCount: '3' }],
      }),
    } as unknown as SelectQueryBuilder<Envelope>;

    const envelopeRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<Envelope>;

    const service = new EnvelopesService(
      envelopeRepository,
      {} as FoldersService,
      {} as TenantsService,
      {} as DocumentsService,
      new EventEmitter2(),
    );

    const result = await service.findAll('tenant-1', {});

    expect(result.data[0]?.pendingSignerCount).toBe(3);
    expect(result.data[0]?.documentCount).toBe(2);
    expect(qb.addSelect).toHaveBeenCalledTimes(2);
  });
});
