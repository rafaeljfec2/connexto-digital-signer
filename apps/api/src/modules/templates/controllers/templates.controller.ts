import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ListTemplatesQueryDto } from '../dto/list-templates-query.dto';
import { AddTemplateDocumentDto } from '../dto/add-template-document.dto';
import { AddTemplateSignerDto } from '../dto/add-template-signer.dto';
import { UpdateTemplateSignerDto } from '../dto/update-template-signer.dto';
import { BatchUpdateTemplateFieldsDto } from '../dto/batch-update-template-fields.dto';
import { BatchUpdateTemplateVariablesDto } from '../dto/batch-update-template-variables.dto';
import { CreateEnvelopeFromTemplateDto } from '../dto/create-envelope-from-template.dto';
import { CreateTemplateFromEnvelopeDto } from '../dto/create-template-from-envelope.dto';
import { MAX_SIZE_BYTES } from '../../../shared/storage/file-validator';

const UPLOAD_MAX_BYTES = Math.max(...Object.values(MAX_SIZE_BYTES));

@ApiTags('Templates')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List templates with filters' })
  @ApiResponse({ status: 200, description: 'Paginated templates' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListTemplatesQueryDto,
  ) {
    return this.templatesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.templatesService.findOneDetail(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    await this.templatesService.remove(id, tenantId);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add a document to the template' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 201, description: 'Document added' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }))
  addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: AddTemplateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file === undefined || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('File is required');
    }
    return this.templatesService.addDocument(id, tenantId, file.buffer, dto);
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @TenantId() tenantId: string,
  ) {
    await this.templatesService.removeDocument(id, docId, tenantId);
  }

  @Post(':id/signers')
  addSigner(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: AddTemplateSignerDto,
  ) {
    return this.templatesService.addSigner(id, tenantId, dto);
  }

  @Patch(':id/signers/:signerId')
  updateSigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('signerId', ParseUUIDPipe) signerId: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateTemplateSignerDto,
  ) {
    return this.templatesService.updateSigner(id, signerId, tenantId, dto);
  }

  @Delete(':id/signers/:signerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('signerId', ParseUUIDPipe) signerId: string,
    @TenantId() tenantId: string,
  ) {
    await this.templatesService.removeSigner(id, signerId, tenantId);
  }

  @Put(':id/documents/:docId/fields/batch')
  replaceFields(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @TenantId() tenantId: string,
    @Body() dto: BatchUpdateTemplateFieldsDto,
  ) {
    return this.templatesService.replaceFields(id, docId, tenantId, dto);
  }

  @Put(':id/variables')
  updateVariables(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: BatchUpdateTemplateVariablesDto,
  ) {
    return this.templatesService.updateVariables(id, tenantId, dto);
  }

  @Post(':id/envelopes')
  @ApiOperation({ summary: 'Create an envelope from a template' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiResponse({ status: 201, description: 'Envelope created from template' })
  createEnvelopeFromTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateEnvelopeFromTemplateDto,
  ) {
    return this.templatesService.createEnvelopeFromTemplate(id, tenantId, dto);
  }
}

@ApiTags('Envelopes')
@ApiBearerAuth()
@Controller('envelopes')
export class EnvelopeTemplateController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post(':id/template')
  @ApiOperation({ summary: 'Create a template from an existing envelope' })
  @ApiParam({ name: 'id', description: 'Envelope UUID' })
  @ApiResponse({ status: 201, description: 'Template created from envelope' })
  createTemplateFromEnvelope(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateTemplateFromEnvelopeDto,
  ) {
    return this.templatesService.createFromEnvelope(tenantId, id, dto);
  }
}
