import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { EnvelopesService } from '../services/envelopes.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { CreateEnvelopeDto } from '../dto/create-envelope.dto';
import { UpdateEnvelopeDto } from '../dto/update-envelope.dto';
import { ListEnvelopesQueryDto } from '../dto/list-envelopes-query.dto';

@ApiTags('Envelopes')
@ApiBearerAuth()
@RequireAuthMethod('jwt')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('envelopes')
export class EnvelopesController {
  constructor(
    private readonly envelopesService: EnvelopesService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new envelope' })
  @ApiResponse({ status: 201, description: 'Envelope created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEnvelopeDto,
  ) {
    return this.envelopesService.create(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get envelope statistics for the tenant' })
  @ApiResponse({ status: 200, description: 'Envelope stats' })
  getStats(@TenantId() tenantId: string) {
    return this.envelopesService.getStats(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List envelopes with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of envelopes' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListEnvelopesQueryDto,
  ) {
    return this.envelopesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get envelope details' })
  @ApiParam({ name: 'id', description: 'Envelope UUID' })
  @ApiResponse({ status: 200, description: 'Envelope details' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.envelopesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an envelope' })
  @ApiParam({ name: 'id', description: 'Envelope UUID' })
  @ApiResponse({ status: 200, description: 'Envelope updated' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateEnvelopeDto,
  ) {
    return this.envelopesService.update(id, tenantId, dto);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents in an envelope' })
  @ApiParam({ name: 'id', description: 'Envelope UUID' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  findDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.documentsService.findByEnvelope(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft envelope' })
  @ApiParam({ name: 'id', description: 'Envelope UUID' })
  @ApiResponse({ status: 204, description: 'Envelope deleted' })
  @ApiResponse({ status: 404, description: 'Envelope not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    await this.envelopesService.deleteDraft(id, tenantId);
  }
}
