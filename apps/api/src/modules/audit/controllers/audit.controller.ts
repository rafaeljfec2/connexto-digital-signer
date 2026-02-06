import { Controller, Get, Param } from '@nestjs/common';
import { TenantId } from '@connexto/shared';
import { AuditService } from '../services/audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entities/:entityType/:entityId')
  findByEntity(
    @TenantId() tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    return this.auditService.findByEntity(tenantId, entityType, entityId);
  }
}
