import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { FoldersService } from '../services/folders.service';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { UpdateFolderDto } from '../dto/update-folder.dto';

@ApiTags('Folders')
@RequireAuthMethod('jwt')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(tenantId, dto);
  }

  @Get()
  getTree(@TenantId() tenantId: string) {
    return this.foldersService.getTree(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.foldersService.findOne(id, tenantId);
  }

  @Get(':id/children')
  getChildren(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.foldersService.getChildren(tenantId, id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    await this.foldersService.remove(id, tenantId);
  }
}
