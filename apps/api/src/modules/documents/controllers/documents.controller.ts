import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Patch,
  Param,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';

@ApiTags('Documents')
@RequireAuthMethod('jwt')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @TenantId() tenantId: string,
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      if (!Buffer.isBuffer(file.buffer)) {
        throw new BadRequestException('Invalid file');
      }
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }
      const maxSizeMb = Number.parseInt(process.env['MAX_UPLOAD_SIZE_MB'] ?? '10', 10);
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new BadRequestException(`File size exceeds ${maxSizeMb}MB`);
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
  @Header('Content-Type', 'application/pdf')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    const buffer = await this.documentsService.getOriginalFile(document);
    return new StreamableFile(buffer);
  }

  @Get(':id/signed-file')
  async getSignedFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const document = await this.documentsService.findOne(id, tenantId);
    const buffer = await this.documentsService.getFinalFile(document);
    if (buffer === null) {
      res.status(404).json({ message: 'Signed document is not available yet' });
      return;
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename="${document.title}-signed.pdf"`,
      'Cache-Control': 'private, max-age=300',
    });
    res.end(buffer);
  }

  @Post(':id/file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file === undefined || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('File is required');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    const maxSizeMb = Number.parseInt(process.env['MAX_UPLOAD_SIZE_MB'] ?? '10', 10);
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(`File size exceeds ${maxSizeMb}MB`);
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
