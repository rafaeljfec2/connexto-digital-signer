import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Document, DocumentStatus } from '../entities/document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
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
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: S3StorageService
  ) {}

  async create(
    tenantId: string,
    createDocumentDto: CreateDocumentDto,
    file: Buffer
  ): Promise<Document> {
    const hash = sha256(file);
    const key = `tenants/${tenantId}/documents/${Date.now()}-${hash.slice(0, 16)}.pdf`;
    await this.storage.put(key, file);
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
    const saved = await this.documentRepository.save(document);
    const createdPayload: DocumentCreatedEvent = {
      documentId: saved.id,
      tenantId: saved.tenantId,
      title: saved.title,
      createdAt: saved.createdAt,
    };
    this.eventEmitter.emit(EVENT_DOCUMENT_CREATED, createdPayload);
    return saved;
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

  async getOriginalFile(document: Document): Promise<Buffer> {
    return this.storage.get(document.originalFileKey);
  }

  async getFinalFile(document: Document): Promise<Buffer | null> {
    if (document.finalFileKey === null) return null;
    return this.storage.get(document.finalFileKey);
  }
}
