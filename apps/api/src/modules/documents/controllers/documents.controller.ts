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
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { MAX_SIZE_BYTES } from '../../../shared/storage/file-validator';

const UPLOAD_MAX_BYTES = Math.max(...Object.values(MAX_SIZE_BYTES));

@ApiTags('Documents')
@RequireAuthMethod('jwt')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
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
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    return this.documentsService.findOne(id, tenantId);
  }

  @Get(':id/file')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    return this.documentsService.getOriginalFileUrl(document);
  }

  @Get(':id/signed-file')
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

  @Post(':id/file')
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() updateDocumentDto: UpdateDocumentDto
  ) {
    return this.documentsService.update(id, tenantId, updateDocumentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    await this.documentsService.deleteDraft(id, tenantId);
  }
}
