import type { Repository } from 'typeorm';
import { FoldersService } from './folders.service';
import { Folder } from '../entities/folder.entity';

const buildFolder = (overrides?: Partial<Folder>): Folder => ({
  id: 'folder-1',
  tenantId: 'tenant-1',
  parentId: null,
  name: 'Documentos',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('FoldersService', () => {
  let service: FoldersService;
  let folderRepository: Repository<Folder>;

  beforeEach(() => {
    folderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as Repository<Folder>;
    service = new FoldersService(folderRepository);
  });

  describe('getTree', () => {
    test('creates the default root folder when the tenant has none', async () => {
      const root = buildFolder();
      (folderRepository.findOne as jest.Mock).mockResolvedValue(null);
      (folderRepository.create as jest.Mock).mockReturnValue(root);
      (folderRepository.save as jest.Mock).mockResolvedValue(root);
      (folderRepository.find as jest.Mock).mockResolvedValue([root]);

      const tree = await service.getTree('tenant-1');

      expect(folderRepository.save).toHaveBeenCalledWith(root);
      expect(tree).toEqual([
        {
          id: root.id,
          name: root.name,
          parentId: null,
          createdAt: root.createdAt,
          children: [],
        },
      ]);
    });

    test('does not create a second root when Documentos already exists', async () => {
      const root = buildFolder();
      (folderRepository.findOne as jest.Mock).mockResolvedValue(root);
      (folderRepository.find as jest.Mock).mockResolvedValue([root]);

      const tree = await service.getTree('tenant-1');

      expect(folderRepository.create).not.toHaveBeenCalled();
      expect(folderRepository.save).not.toHaveBeenCalled();
      expect(tree).toHaveLength(1);
    });
  });
});
