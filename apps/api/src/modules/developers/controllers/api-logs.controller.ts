import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { ApiRequestLogsService } from '../services/api-request-logs.service';
import { ApiLogsQueryDto } from '../dto/api-logs-query.dto';

@ApiTags('Developers - API Logs')
@ApiBearerAuth()
@RequireAuthMethod('jwt')
@Controller('developers/logs')
export class ApiLogsController {
  constructor(private readonly logsService: ApiRequestLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List API request logs with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of API request logs' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ApiLogsQueryDto,
  ) {
    return this.logsService.findAll(tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated API usage statistics' })
  @ApiResponse({ status: 200, description: 'API usage stats' })
  getStats(@TenantId() tenantId: string) {
    return this.logsService.getStats(tenantId);
  }
}
