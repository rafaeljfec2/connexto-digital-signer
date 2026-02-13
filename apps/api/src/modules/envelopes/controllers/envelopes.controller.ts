import {
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { EnvelopesService } from '../services/envelopes.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { CreateEnvelopeDto } from '../dto/create-envelope.dto';
import { UpdateEnvelopeDto } from '../dto/update-envelope.dto';
import { ListEnvelopesQueryDto } from '../dto/list-envelopes-query.dto';

@ApiTags('Envelopes')
@RequireAuthMethod('jwt')
@Controller('envelopes')
export class EnvelopesController {
  constructor(
    private readonly envelopesService: EnvelopesService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEnvelopeDto,
  ) {
    return this.envelopesService.create(tenantId, dto);
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.envelopesService.getStats(tenantId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListEnvelopesQueryDto,
  ) {
    return this.envelopesService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.envelopesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateEnvelopeDto,
  ) {
    return this.envelopesService.update(id, tenantId, dto);
  }

  @Get(':id/documents')
  findDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.documentsService.findByEnvelope(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    await this.envelopesService.deleteDraft(id, tenantId);
  }
}
