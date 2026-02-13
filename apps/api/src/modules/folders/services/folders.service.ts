import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Folder } from '../entities/folder.entity';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

export interface FolderTreeNode {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdAt: Date;
  readonly children: FolderTreeNode[];
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async create(tenantId: string, dto: CreateFolderDto): Promise<Folder> {
    if (dto.parentId) {
      await this.findOne(dto.parentId, tenantId);
    }

    const folder = this.folderRepository.create({
      tenantId,
      name: dto.name,
      parentId: dto.parentId ?? null,
    });

    return this.folderRepository.save(folder);
  }

  async findOne(id: string, tenantId: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id, tenantId },
    });
    if (folder === null) {
      throw new NotFoundException(`Folder ${id} not found`);
    }
    return folder;
  }

  async getTree(tenantId: string): Promise<FolderTreeNode[]> {
    const allFolders = await this.folderRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });

    return this.buildTree(allFolders, null);
  }

  async getChildren(tenantId: string, parentId: string | null): Promise<Folder[]> {
    return this.folderRepository.find({
      where: {
        tenantId,
        parentId: parentId ?? IsNull(),
      },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.findOne(id, tenantId);

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A folder cannot be its own parent');
      }
      if (dto.parentId !== null) {
        await this.findOne(dto.parentId, tenantId);
        await this.ensureNoCircularReference(id, dto.parentId, tenantId);
      }
      folder.parentId = dto.parentId;
    }

    if (dto.name !== undefined) {
      folder.name = dto.name;
    }

    return this.folderRepository.save(folder);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const folder = await this.findOne(id, tenantId);
    await this.folderRepository.remove(folder);
  }

  async ensureRootFolder(tenantId: string): Promise<Folder> {
    const existing = await this.folderRepository.findOne({
      where: { tenantId, parentId: IsNull(), name: 'Documentos' },
    });
    if (existing) return existing;

    const root = this.folderRepository.create({
      tenantId,
      name: 'Documentos',
      parentId: null,
    });
    return this.folderRepository.save(root);
  }

  private buildTree(folders: Folder[], parentId: string | null): FolderTreeNode[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: f.createdAt,
        children: this.buildTree(folders, f.id),
      }));
  }

  private async ensureNoCircularReference(
    folderId: string,
    newParentId: string,
    tenantId: string,
  ): Promise<void> {
    let currentId: string | null = newParentId;

    while (currentId !== null) {
      if (currentId === folderId) {
        throw new BadRequestException('Moving this folder would create a circular reference');
      }
      const parent = await this.folderRepository.findOne({
        where: { id: currentId, tenantId },
      });
      currentId = parent?.parentId ?? null;
    }
  }
}
