import { FoldersEventsHandler } from './folders.events-handler';
import { FoldersService } from '../services/folders.service';
import { Folder } from '../entities/folder.entity';

describe('FoldersEventsHandler', () => {
  test('seeds the root folder when a tenant is created', async () => {
    const foldersService = {
      ensureRootFolder: jest.fn().mockResolvedValue({ id: 'folder-1' } as Folder),
    };
    const handler = new FoldersEventsHandler(foldersService as unknown as FoldersService);

    await handler.handleTenantCreated({
      tenantId: 'tenant-1',
      ownerEmail: 'owner@acme.com',
      ownerName: 'Owner',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(foldersService.ensureRootFolder).toHaveBeenCalledWith('tenant-1');
  });
});
