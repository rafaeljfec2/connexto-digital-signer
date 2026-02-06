import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TenantId, Public } from '@connexto/shared';
import { TenantsService } from '../services/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { throttleConfig } from '../../../common/config/throttle.config';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';

@ApiTags('Tenants')
@RequireAuthMethod('jwt')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ) {
    return this.tenantsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @TenantId() tenantId: string
  ) {
    return this.tenantsService.update(id, updateTenantDto, tenantId);
  }
}
