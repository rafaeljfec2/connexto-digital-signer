import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { AuditService } from '../services/audit.service';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { HistoryQueryDto } from '../dto/history-query.dto';

@ApiTags('Audit')
@RequireAuthMethod('jwt')
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

  @ApiOperation({ summary: 'List paginated history events for the tenant' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by document or envelope title' })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'from', required: false, description: 'Filter events from date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Filter events up to date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @Get('history')
  findHistory(@TenantId() tenantId: string, @Query() query: HistoryQueryDto) {
    return this.auditService.findHistory(tenantId, query);
  }

  @ApiOperation({ summary: 'List history grouped by document with pagination and optional search' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by document title' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @Get('history/documents')
  findHistoryByDocuments(@TenantId() tenantId: string, @Query() query: HistoryQueryDto) {
    return this.auditService.findHistoryByDocuments(tenantId, query);
  }

  @ApiOperation({ summary: 'List all audit events for a specific document' })
  @Get('history/documents/:documentId/events')
  findDocumentEvents(
    @TenantId() tenantId: string,
    @Param('documentId') documentId: string
  ) {
    return this.auditService.findDocumentEvents(tenantId, documentId);
  }
}
