import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
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
import { validateFile } from '../../../shared/storage/file-validator';

const PRESIGNED_URL_EXPIRY_SECONDS = 300;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: S3StorageService,
    private readonly logger: Logger,
  ) {}

  async create(
    tenantId: string,
    dto: CreateDocumentDto,
    file?: Buffer
  ): Promise<Document> {
    const documentId = randomUUID();
    let key: string | null = null;
    let hash: string | null = null;
    let mimeType: string | null = null;
    let size: number | null = null;

    if (file) {
      const validated = validateFile(file);
      hash = sha256(file);
      mimeType = validated.mimeType;
      size = file.length;
      key = `tenants/${tenantId}/documents/${documentId}/original.${validated.extension}`;
      try {
        await this.storage.put(key, file, mimeType);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Failed to upload file: ${message}`, stack);
        throw error;
      }
    }

    const document = this.documentRepository.create({
      id: documentId,
      title: dto.title,
      envelopeId: dto.envelopeId,
      position: dto.position ?? 0,
      tenantId,
      originalFileKey: key,
      originalHash: hash,
      mimeType,
      size,
      status: DocumentStatus.DRAFT,
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

  async createFromTemplate(
    tenantId: string,
    params: {
      readonly id: string;
      readonly title: string;
      readonly envelopeId: string;
      readonly position: number;
      readonly originalFileKey: string;
      readonly originalHash: string;
      readonly mimeType: string;
      readonly size: number;
    },
  ): Promise<Document> {
    const document = this.documentRepository.create({
      id: params.id,
      title: params.title,
      envelopeId: params.envelopeId,
      position: params.position,
      tenantId,
      originalFileKey: params.originalFileKey,
      originalHash: params.originalHash,
      mimeType: params.mimeType,
      size: params.size,
      status: DocumentStatus.DRAFT,
    });

    const saved = await this.documentRepository.save(document);

    const createdPayload: DocumentCreatedEvent = {
      documentId: saved.id,
      tenantId,
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
    const validated = validateFile(file);
    const hash = sha256(file);
    const key = `tenants/${tenantId}/documents/${id}/original.${validated.extension}`;

    const previousKey = document.originalFileKey;

    try {
      await this.storage.put(key, file, validated.mimeType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to upload file: ${message}`, stack);
      throw error;
    }

    if (previousKey && previousKey !== key) {
      try {
        await this.storage.delete(previousKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete orphaned S3 key: ${message}`);
      }
    }

    document.originalFileKey = key;
    document.originalHash = hash;
    document.mimeType = validated.mimeType;
    document.size = file.length;
    document.finalFileKey = null;
    document.finalHash = null;
    document.status = DocumentStatus.DRAFT;
    return this.documentRepository.save(document);
  }

  async findAll(
    tenantId: string,
    envelopeId: string
  ): Promise<Document[]> {
    return this.documentRepository.find({
      where: { tenantId, envelopeId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
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

  async findByIds(ids: string[], tenantId: string): Promise<Document[]> {
    if (ids.length === 0) return [];
    return this.documentRepository.find({
      where: { id: In(ids), tenantId },
    });
  }

  async findByEnvelope(envelopeId: string, tenantId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { envelopeId, tenantId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateDocumentDto
  ): Promise<Document> {
    const document = await this.findOne(id, tenantId);
    if (dto.title !== undefined) document.title = dto.title;
    if (dto.position !== undefined) document.position = dto.position;
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
    const key = `tenants/${tenantId}/documents/${id}/signed.pdf`;
    await this.storage.put(key, finalPdfBuffer, 'application/pdf');
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

  async getOriginalFileUrl(
    document: Document,
  ): Promise<{ url: string; mimeType: string | null; expiresIn: number }> {
    if (document.originalFileKey === null) {
      throw new NotFoundException('Document has no file uploaded yet');
    }
    const url = await this.storage.getSignedUrl(
      document.originalFileKey,
      PRESIGNED_URL_EXPIRY_SECONDS,
      { disposition: 'attachment' },
    );
    return { url, mimeType: document.mimeType, expiresIn: PRESIGNED_URL_EXPIRY_SECONDS };
  }

  async getFinalFileUrl(
    document: Document,
  ): Promise<{ url: string; expiresIn: number } | null> {
    if (document.finalFileKey === null) return null;
    const url = await this.storage.getSignedUrl(
      document.finalFileKey,
      PRESIGNED_URL_EXPIRY_SECONDS,
      { disposition: 'attachment' },
    );
    return { url, expiresIn: PRESIGNED_URL_EXPIRY_SECONDS };
  }
}
