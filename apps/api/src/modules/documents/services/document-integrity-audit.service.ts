import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';

export type CompletedWithoutFinalFileRecord = Readonly<{
  documentId: string;
  envelopeId: string;
  updatedAt: Date;
}>;

export type DocumentIntegrityAuditResult = Readonly<{
  scannedAt: Date;
  total: number;
  limit: number;
  records: readonly CompletedWithoutFinalFileRecord[];
}>;

const DEFAULT_AUDIT_LIMIT = 100;
const MAX_AUDIT_LIMIT = 500;

@Injectable()
export class DocumentIntegrityAuditService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async findCompletedWithoutFinalFile(
    tenantId: string,
    limit = DEFAULT_AUDIT_LIMIT,
  ): Promise<DocumentIntegrityAuditResult> {
    const boundedLimit = Math.min(Math.max(limit, 1), MAX_AUDIT_LIMIT);
    const [records, total] = await this.documentRepository.findAndCount({
      where: {
        tenantId,
        status: DocumentStatus.COMPLETED,
        finalFileKey: IsNull(),
      },
      select: {
        id: true,
        envelopeId: true,
        updatedAt: true,
      },
      order: { updatedAt: 'DESC' },
      take: boundedLimit,
    });

    return {
      scannedAt: new Date(),
      total,
      limit: boundedLimit,
      records: records.map((row) => ({
        documentId: row.id,
        envelopeId: row.envelopeId,
        updatedAt: row.updatedAt,
      })),
    };
  }
}
