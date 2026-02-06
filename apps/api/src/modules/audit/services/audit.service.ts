import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorType?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const entry = this.auditRepository.create(dto);
    return this.auditRepository.save(entry);
  }

  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }
}
