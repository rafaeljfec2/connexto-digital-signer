import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { ApiKeysService } from '../services/api-keys.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';

@ApiTags('Developers - API Keys')
@ApiBearerAuth()
@RequireAuthMethod('jwt')
@Controller('developers/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created. Raw key is returned only once.' })
  @ApiResponse({ status: 400, description: 'Validation error or max keys reached' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    const { apiKey, rawKey } = await this.apiKeysService.create(tenantId, dto);
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      keyLastFour: apiKey.keyLastFour,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      rawKey,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all active API keys for the tenant' })
  @ApiResponse({ status: 200, description: 'List of API keys (without hashes)' })
  async findAll(@TenantId() tenantId: string) {
    const keys = await this.apiKeysService.findAllByTenant(tenantId);
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      keyLastFour: k.keyLastFour,
      scopes: k.scopes,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      totalRequests: k.totalRequests,
      createdAt: k.createdAt,
    }));
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.apiKeysService.revoke(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke and delete an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.apiKeysService.revoke(id, tenantId);
  }
}
