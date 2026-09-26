import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { EnvelopesService } from './envelopes.service';
import { Envelope, EnvelopeStatus, SigningMode } from '../entities/envelope.entity';
import { FoldersService } from '../../folders/services/folders.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Folder } from '../../folders/entities/folder.entity';

const buildFolder = (overrides?: Partial<Folder>): Folder => ({
  id: 'folder-1',
  tenantId: 'tenant-1',
  parentId: null,
  name: 'Documentos',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildTenant = (overrides?: Partial<Tenant>): Tenant =>
  ({
    id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    defaultSigningLanguage: 'pt-br',
    defaultReminderInterval: 'none',
    defaultClosureMode: 'automatic',
    ...overrides,
  }) as Tenant;

const buildEnvelope = (overrides?: Partial<Envelope>): Envelope => ({
  id: 'envelope-1',
  tenantId: 'tenant-1',
  folderId: 'folder-1',
  title: 'New document',
  status: EnvelopeStatus.DRAFT,
  signingMode: SigningMode.PARALLEL,
  expiresAt: null,
  reminderInterval: 'none',
  signingLanguage: 'pt-br',
  closureMode: 'automatic',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildDocument = (overrides?: Partial<Document>): Document =>
  ({
    id: 'doc-1',
    tenantId: 'tenant-1',
    envelopeId: 'envelope-1',
    title: 'New document',
    status: DocumentStatus.DRAFT,
    position: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as Document;

describe('EnvelopesService', () => {
  let service: EnvelopesService;
  let envelopeRepository: Repository<Envelope>;
  let foldersService: jest.Mocked<Pick<FoldersService, 'findOne' | 'ensureRootFolder'>>;
  let tenantsService: jest.Mocked<Pick<TenantsService, 'findOne'>>;
  let documentsService: jest.Mocked<Pick<DocumentsService, 'create'>>;

  beforeEach(() => {
    envelopeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as Repository<Envelope>;
    foldersService = {
      findOne: jest.fn(),
      ensureRootFolder: jest.fn(),
    };
    tenantsService = {
      findOne: jest.fn(),
    };
    documentsService = {
      create: jest.fn(),
    };
    service = new EnvelopesService(
      envelopeRepository,
      foldersService as unknown as FoldersService,
      tenantsService as unknown as TenantsService,
      documentsService as unknown as DocumentsService,
    );
  });

  describe('create', () => {
    test('creates the root folder when folderId is omitted', async () => {
      const root = buildFolder();
      const tenant = buildTenant();
      const created = buildEnvelope();
      foldersService.ensureRootFolder.mockResolvedValue(root);
      tenantsService.findOne.mockResolvedValue(tenant);
      (envelopeRepository.create as jest.Mock).mockReturnValue(created);
      (envelopeRepository.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create('tenant-1', { title: 'New document' });

      expect(foldersService.ensureRootFolder).toHaveBeenCalledWith('tenant-1');
      expect(foldersService.findOne).not.toHaveBeenCalled();
      expect(envelopeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ folderId: root.id, title: 'New document' }),
      );
      expect(result.id).toBe('envelope-1');
    });

    test('uses the provided folderId when present', async () => {
      const folder = buildFolder({ id: 'folder-9' });
      const tenant = buildTenant();
      const created = buildEnvelope({ folderId: 'folder-9' });
      foldersService.findOne.mockResolvedValue(folder);
      tenantsService.findOne.mockResolvedValue(tenant);
      (envelopeRepository.create as jest.Mock).mockReturnValue(created);
      (envelopeRepository.save as jest.Mock).mockResolvedValue(created);

      await service.create('tenant-1', { title: 'New document', folderId: 'folder-9' });

      expect(foldersService.findOne).toHaveBeenCalledWith('folder-9', 'tenant-1');
      expect(foldersService.ensureRootFolder).not.toHaveBeenCalled();
    });

    test('rejects an unknown folderId', async () => {
      foldersService.findOne.mockRejectedValue(new NotFoundException('Folder missing'));

      await expect(
        service.create('tenant-1', { title: 'New document', folderId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDraft', () => {
    test('creates root folder, envelope and empty document', async () => {
      const root = buildFolder();
      const tenant = buildTenant();
      const envelope = buildEnvelope();
      const document = buildDocument();
      foldersService.ensureRootFolder.mockResolvedValue(root);
      tenantsService.findOne.mockResolvedValue(tenant);
      (envelopeRepository.create as jest.Mock).mockReturnValue(envelope);
      (envelopeRepository.save as jest.Mock).mockResolvedValue(envelope);
      documentsService.create.mockResolvedValue(document);

      const result = await service.createDraft('tenant-1', 'New document');

      expect(foldersService.ensureRootFolder).toHaveBeenCalledWith('tenant-1');
      expect(documentsService.create).toHaveBeenCalledWith('tenant-1', {
        title: 'New document',
        envelopeId: envelope.id,
      });
      expect(result.id).toBe('doc-1');
    });

    test('removes the envelope when document creation fails', async () => {
      const root = buildFolder();
      const tenant = buildTenant();
      const envelope = buildEnvelope();
      foldersService.ensureRootFolder.mockResolvedValue(root);
      tenantsService.findOne.mockResolvedValue(tenant);
      (envelopeRepository.create as jest.Mock).mockReturnValue(envelope);
      (envelopeRepository.save as jest.Mock).mockResolvedValue(envelope);
      documentsService.create.mockRejectedValue(new Error('persist failed'));

      await expect(service.createDraft('tenant-1', 'New document')).rejects.toThrow('persist failed');
      expect(envelopeRepository.remove).toHaveBeenCalledWith(envelope);
    });
  });
});
