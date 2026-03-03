import { TenantId } from '@connexto/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { DocumentEventsQueryDto, DocumentHistoryQueryDto } from '../dto/document-history-query.dto';
import { HistoryQueryDto } from '../dto/history-query.dto';
import { AuditService } from '../services/audit.service';

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
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by document or envelope title',
  })
  @ApiQuery({ name: 'eventType', required: false, description: 'Filter by event type' })
  @ApiQuery({ name: 'from', required: false, description: 'Filter events from date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Filter events up to date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @Get('history')
  findHistory(@TenantId() tenantId: string, @Query() query: HistoryQueryDto) {
    return this.auditService.findHistory(tenantId, query);
  }

  @ApiOperation({ summary: 'List documents with activity summary, grouped by document' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by document title (ILIKE)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @Get('history/documents')
  findDocumentHistory(@TenantId() tenantId: string, @Query() query: DocumentHistoryQueryDto) {
    return this.auditService.findDocumentHistory(tenantId, query);
  }

  @ApiOperation({ summary: 'List audit events timeline for a specific document' })
  @ApiParam({ name: 'documentId', description: 'Document UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20, max 100)' })
  @Get('history/documents/:documentId/events')
  findDocumentEvents(
    @TenantId() tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query() query: DocumentEventsQueryDto
  ) {
    return this.auditService.findDocumentEvents(tenantId, documentId, query);
  }
}
