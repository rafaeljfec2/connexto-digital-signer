import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { WebhooksService } from '../services/webhooks.service';
import { CreateWebhookConfigDto } from '../dto/create-webhook-config.dto';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';

@ApiTags('Webhooks')
@RequireAuthMethod('api_key')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('configs')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWebhookConfigDto
  ) {
    return this.webhooksService.create(tenantId, dto);
  }

  @Get('configs')
  list(@TenantId() tenantId: string) {
    return this.webhooksService.findByTenant(tenantId);
  }
}
