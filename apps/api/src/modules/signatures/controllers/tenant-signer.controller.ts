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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { TenantSignerService } from '../services/tenant-signer.service';
import { CreateTenantSignerDto } from '../dto/create-tenant-signer.dto';
import { UpdateTenantSignerDto } from '../dto/update-tenant-signer.dto';
import { SearchTenantSignerQueryDto } from '../dto/search-tenant-signer-query.dto';
import { ListTenantSignersQueryDto } from '../dto/list-tenant-signers-query.dto';

@ApiTags('Tenant Signers')
@RequireAuthMethod('jwt')
@Controller('tenant-signers')
export class TenantSignerController {
  constructor(
    private readonly tenantSignerService: TenantSignerService,
  ) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListTenantSignersQueryDto,
  ) {
    return this.tenantSignerService.findAll(tenantId, query);
  }

  @Get('search')
  search(
    @TenantId() tenantId: string,
    @Query() query: SearchTenantSignerQueryDto,
  ) {
    return this.tenantSignerService.search(tenantId, query.q ?? '');
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTenantSignerDto,
  ) {
    return this.tenantSignerService.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantSignerDto,
  ) {
    return this.tenantSignerService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tenantSignerService.remove(tenantId, id);
  }
}
