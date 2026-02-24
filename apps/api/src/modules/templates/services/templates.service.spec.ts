import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemplatesService } from './templates.service';
import { Template } from '../entities/template.entity';
import { TemplateDocument } from '../entities/template-document.entity';
import { TemplateSigner } from '../entities/template-signer.entity';
import { TemplateField } from '../entities/template-field.entity';
import { TemplateVariable } from '../entities/template-variable.entity';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { SignaturesService } from '../../signatures/services/signatures.service';
import { SignatureFieldsService } from '../../signatures/services/signature-fields.service';
import { SigningMode } from '../../envelopes/entities/envelope.entity';
import { SignerRole } from '../../signatures/entities/signer.entity';

const TENANT_ID = 'tenant-1';
const TEMPLATE_ID = 'tmpl-1';

function buildTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: 'NDA Template',
    description: null,
    category: null,
    signingMode: SigningMode.PARALLEL,
    signingLanguage: 'pt-br',
    reminderInterval: 'none',
    closureMode: 'automatic',
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Template;
}

function buildTemplateSigner(
  overrides: Partial<TemplateSigner> = {},
): TemplateSigner {
  return {
    id: 'ts-1',
    templateId: TEMPLATE_ID,
    label: 'contractor',
    role: SignerRole.SIGNER,
    order: null,
    authMethod: 'email',
    requestEmail: false,
    requestCpf: false,
    requestPhone: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TemplateSigner;
}

function makeMockRepo() {
  return {
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [],
        raw: [],
      }),
    }),
    remove: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
  };
}

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templateRepo: ReturnType<typeof makeMockRepo>;
  let templateSignerRepo: ReturnType<typeof makeMockRepo>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    templateRepo = makeMockRepo();
    templateSignerRepo = makeMockRepo();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: getRepositoryToken(Template), useValue: templateRepo },
        {
          provide: getRepositoryToken(TemplateDocument),
          useValue: makeMockRepo(),
        },
        {
          provide: getRepositoryToken(TemplateSigner),
          useValue: templateSignerRepo,
        },
        {
          provide: getRepositoryToken(TemplateField),
          useValue: makeMockRepo(),
        },
        {
          provide: getRepositoryToken(TemplateVariable),
          useValue: makeMockRepo(),
        },
        {
          provide: S3StorageService,
          useValue: {
            put: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            copy: jest.fn(),
          },
        },
        {
          provide: DocumentsService,
          useValue: {
            findByEnvelope: jest.fn().mockResolvedValue([]),
            createFromTemplate: jest.fn(),
          },
        },
        {
          provide: EnvelopesService,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: SignaturesService,
          useValue: {
            findByEnvelope: jest.fn().mockResolvedValue([]),
            addSigner: jest.fn(),
            sendEnvelope: jest.fn(),
          },
        },
        {
          provide: SignatureFieldsService,
          useValue: {
            findByDocument: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(TemplatesService);
  });

  describe('create', () => {
    it('should create a template and emit event', async () => {
      const saved = buildTemplate();
      templateRepo.save.mockResolvedValue(saved);

      const result = await service.create(TENANT_ID, {
        name: 'NDA Template',
      });

      expect(result.name).toBe('NDA Template');
      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'NDA Template',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'template.created',
        expect.objectContaining({
          templateId: saved.id,
          tenantId: TENANT_ID,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return template when found', async () => {
      const tmpl = buildTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);

      const result = await service.findOne(TEMPLATE_ID, TENANT_ID);
      expect(result.id).toBe(TEMPLATE_ID);
    });

    it('should throw NotFoundException when not found', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      const tmpl = buildTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.save.mockImplementation(
        (e: unknown) => Promise.resolve(e),
      );

      const result = await service.update(TEMPLATE_ID, TENANT_ID, {
        name: 'Updated NDA',
      });
      expect(result.name).toBe('Updated NDA');
    });
  });

  describe('addSigner', () => {
    it('should add a signer slot', async () => {
      templateRepo.findOne.mockResolvedValue(buildTemplate());
      templateSignerRepo.findOne.mockResolvedValue(null);
      const saved = buildTemplateSigner();
      templateSignerRepo.save.mockResolvedValue(saved);

      const result = await service.addSigner(
        TEMPLATE_ID,
        TENANT_ID,
        { label: 'contractor' },
      );
      expect(result.label).toBe('contractor');
    });

    it('should reject duplicate signer labels', async () => {
      templateRepo.findOne.mockResolvedValue(buildTemplate());
      templateSignerRepo.findOne.mockResolvedValue(
        buildTemplateSigner(),
      );

      await expect(
        service.addSigner(TEMPLATE_ID, TENANT_ID, {
          label: 'contractor',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
