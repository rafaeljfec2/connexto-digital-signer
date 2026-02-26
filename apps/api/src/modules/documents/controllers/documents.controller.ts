import {
  BadRequestException,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { MAX_SIZE_BYTES } from '../../../shared/storage/file-validator';

const UPLOAD_MAX_BYTES = Math.max(...Object.values(MAX_SIZE_BYTES));

@ApiTags('Documents')
@ApiBearerAuth()
@RequireAuthMethod('jwt')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a document with optional file upload' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Document created' })
  @ApiResponse({ status: 400, description: 'Invalid file or request body' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }))
  async create(
    @TenantId() tenantId: string,
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      if (!Buffer.isBuffer(file.buffer)) {
        throw new BadRequestException('Invalid file');
      }
      return this.documentsService.create(tenantId, createDocumentDto, file.buffer);
    }
    return this.documentsService.create(tenantId, createDocumentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    return this.documentsService.findOne(id, tenantId);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Get presigned URL for the original file' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Presigned URL returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    return this.documentsService.getOriginalFileUrl(document);
  }

  @Get(':id/signed-file')
  @ApiOperation({ summary: 'Get presigned URL for the signed file' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Presigned URL for signed file' })
  @ApiResponse({ status: 404, description: 'Signed document not available' })
  async getSignedFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    const result = await this.documentsService.getFinalFileUrl(document);
    if (result === null) {
      throw new NotFoundException('Signed document is not available yet');
    }
    return result;
  }

  @Get(':id/p7s')
  @ApiOperation({ summary: 'Get presigned URL for the detached .p7s signature file' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Presigned URL for .p7s file' })
  @ApiResponse({ status: 404, description: '.p7s signature file is not available' })
  async getP7sFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    const result = await this.documentsService.getP7sFileUrl(document);
    if (result === null) {
      throw new NotFoundException('.p7s signature file is not available yet');
    }
    return result;
  }

  @Post(':id/file')
  @ApiOperation({ summary: 'Upload or replace the document file' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'File uploaded' })
  @ApiResponse({ status: 400, description: 'File is required' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }))
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file === undefined || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.updateOriginalFile(id, tenantId, file.buffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() updateDocumentDto: UpdateDocumentDto
  ) {
    return this.documentsService.update(id, tenantId, updateDocumentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    await this.documentsService.deleteDraft(id, tenantId);
  }
}
