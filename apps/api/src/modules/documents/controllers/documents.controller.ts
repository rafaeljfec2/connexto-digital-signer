import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { ListDocumentsQueryDto } from '../dto/list-documents-query.dto';
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
    return this.documentsService.create(tenantId, createDocumentDto, file.buffer);
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.documentsService.getStats(tenantId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListDocumentsQueryDto
  ) {
    return this.documentsService.findAll(tenantId, query);
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
}
