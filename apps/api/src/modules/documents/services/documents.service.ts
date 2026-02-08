import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document, DocumentStatus } from '../entities/document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { ListDocumentsQueryDto } from '../dto/list-documents-query.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { sha256 } from '@connexto/shared';
import {
  EVENT_DOCUMENT_COMPLETED,
  EVENT_DOCUMENT_EXPIRED,
  EVENT_DOCUMENT_CREATED,
} from '@connexto/events';
import type {
  DocumentCompletedEvent,
  DocumentExpiredEvent,
  DocumentCreatedEvent,
} from '@connexto/events';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: S3StorageService
  ) {}

  async create(
    tenantId: string,
    createDocumentDto: CreateDocumentDto,
    file?: Buffer
  ): Promise<Document> {
    let key: string | null = null;
    let hash: string | null = null;

    if (file) {
      hash = sha256(file);
      key = `tenants/${tenantId}/documents/${Date.now()}-${hash.slice(0, 16)}.pdf`;
      try {
        await this.storage.put(key, file);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Failed to upload file: ${message}`, stack);
        throw error;
      }
    }

    const document = this.documentRepository.create({
      ...createDocumentDto,
      tenantId,
      originalFileKey: key,
      originalHash: hash,
      status: DocumentStatus.DRAFT,
      expiresAt: createDocumentDto.expiresAt
        ? new Date(createDocumentDto.expiresAt)
        : null,
    });
    let saved: Document;
    try {
      saved = await this.documentRepository.save(document);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to persist document: ${message}`, stack);
      throw error;
    }
    const createdPayload: DocumentCreatedEvent = {
      documentId: saved.id,
      tenantId: saved.tenantId,
      title: saved.title,
      createdAt: saved.createdAt,
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_CREATED, createdPayload);
    return saved;
  }

  async updateOriginalFile(
    id: string,
    tenantId: string,
    file: Buffer
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    const hash = sha256(file);
    const key = `tenants/${tenantId}/documents/${id}/original-${Date.now()}-${hash.slice(0, 16)}.pdf`;
    try {
      await this.storage.put(key, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload file: ${message}`, stack);
      throw error;
    }
    document.originalFileKey = key;
    document.originalHash = hash;
    document.finalFileKey = null;
    document.finalHash = null;
    document.status = DocumentStatus.DRAFT;
    return this.documentRepository.save(document);
  }

  async getStats(tenantId: string): Promise<{
    pending: number;
    completed: number;
    expired: number;
    draft: number;
    total: number;
  }> {
    const [pending, completed, expired, draft, total] = await Promise.all([
      this.documentRepository.count({
        where: { tenantId, status: DocumentStatus.PENDING_SIGNATURES },
      }),
      this.documentRepository.count({
        where: { tenantId, status: DocumentStatus.COMPLETED },
      }),
      this.documentRepository.count({
        where: { tenantId, status: DocumentStatus.EXPIRED },
      }),
      this.documentRepository.count({
        where: { tenantId, status: DocumentStatus.DRAFT },
      }),
      this.documentRepository.count({ where: { tenantId } }),
    ]);
    return {
      pending,
      completed,
      expired,
      draft,
      total,
    };
  }

  async findAll(
    tenantId: string,
    query: ListDocumentsQueryDto
  ): Promise<{
    data: Document[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = query.status
      ? { tenantId, status: query.status }
      : { tenantId };
    const [data, total] = await this.documentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, tenantId },
    });
    if (document === null) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return document;
  }

  async update(
    id: string,
    tenantId: string,
    updateDocumentDto: UpdateDocumentDto
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    Object.assign(document, {
      ...updateDocumentDto,
      expiresAt: updateDocumentDto.expiresAt
        ? new Date(updateDocumentDto.expiresAt)
        : document.expiresAt,
    });
    return this.documentRepository.save(document);
  }

  async setStatus(
    id: string,
    tenantId: string,
    status: DocumentStatus
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    document.status = status;
    return this.documentRepository.save(document);
  }

  async setFinalPdf(
    id: string,
    tenantId: string,
    finalPdfBuffer: Buffer
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    const finalHash = sha256(finalPdfBuffer);
    const key = `tenants/${tenantId}/documents/${id}/final-v${document.version}.pdf`;
    await this.storage.put(key, finalPdfBuffer);
    document.finalFileKey = key;
    document.finalHash = finalHash;
    document.status = DocumentStatus.COMPLETED;
    const saved = await this.documentRepository.save(document);
    const payload: DocumentCompletedEvent = {
      documentId: saved.id,
      tenantId: saved.tenantId,
      completedAt: new Date(),
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_COMPLETED, payload);
    return saved;
  }

  async markExpired(id: string, tenantId: string): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    document.status = DocumentStatus.EXPIRED;
    const saved = await this.documentRepository.save(document);
    const payload: DocumentExpiredEvent = {
      documentId: saved.id,
      tenantId: saved.tenantId,
      expiredAt: new Date(),
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_EXPIRED, payload);
    return saved;
  }

  async closeDocument(id: string, tenantId: string): Promise<Document> {
    const document = await this.findOne(id, tenantId);

    if (document.status !== DocumentStatus.PENDING_SIGNATURES) {
      throw new BadRequestException(
        'Only documents with pending signatures can be manually closed',
      );
    }

    document.status = DocumentStatus.COMPLETED;
    const saved = await this.documentRepository.save(document);

    const payload: DocumentCompletedEvent = {
      documentId: saved.id,
      tenantId: saved.tenantId,
      completedAt: new Date(),
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_COMPLETED, payload);
    return saved;
  }

  async deleteDraft(id: string, tenantId: string): Promise<void> {
    const document = await this.findOne(id, tenantId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft documents can be deleted');
    }

    if (document.originalFileKey) {
      try {
        await this.storage.delete(document.originalFileKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete file from storage: ${message}`);
      }
    }

    await this.documentRepository.remove(document);
  }

  async getOriginalFile(document: Document): Promise<Buffer> {
    if (document.originalFileKey === null) {
      throw new NotFoundException('Document has no file uploaded yet');
    }
    return this.storage.get(document.originalFileKey);
  }

  async getFinalFile(document: Document): Promise<Buffer | null> {
    if (document.finalFileKey === null) return null;
    return this.storage.get(document.finalFileKey);
  }
}
