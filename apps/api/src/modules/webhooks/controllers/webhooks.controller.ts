import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { WebhooksService } from '../services/webhooks.service';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from '../dto/update-webhook-config.dto';
import { WebhookDeliveryQueryDto } from '../dto/webhook-delivery-query.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('configs')
  @ApiOperation({ summary: 'Create a webhook configuration' })
  @ApiResponse({ status: 201, description: 'Webhook config created' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWebhookConfigDto,
  ) {
    return this.webhooksService.create(tenantId, dto);
  }

  @Get('configs')
  @ApiOperation({ summary: 'List all active webhook configs' })
  @ApiResponse({ status: 200, description: 'List of webhook configs' })
  list(@TenantId() tenantId: string) {
    return this.webhooksService.findByTenant(tenantId);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get webhook config details' })
  @ApiResponse({ status: 200, description: 'Webhook config details' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooksService.findOneByTenant(id, tenantId);
  }

  @Patch('configs/:id')
  @ApiOperation({ summary: 'Update a webhook configuration' })
  @ApiResponse({ status: 200, description: 'Webhook config updated' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookConfigDto,
  ) {
    return this.webhooksService.update(id, tenantId, dto);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a webhook configuration' })
  @ApiResponse({ status: 204, description: 'Webhook config deactivated' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webhooksService.softDelete(id, tenantId);
  }

  @Post('configs/:id/test')
  @ApiOperation({ summary: 'Send a test ping to the webhook' })
  @ApiResponse({ status: 200, description: 'Ping result' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  testPing(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.webhooksService.sendTestPing(id, tenantId);
  }

  @Get('configs/:id/deliveries')
  @ApiOperation({ summary: 'List delivery logs for a webhook config' })
  @ApiResponse({ status: 200, description: 'Paginated delivery logs' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  listDeliveries(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    return this.webhooksService.findDeliveries(
      id,
      tenantId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Post('deliveries/:id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiResponse({ status: 202, description: 'Delivery queued for retry' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async retryDelivery(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webhooksService.retryDelivery(id, tenantId);
    return { status: 'queued' };
  }
}
