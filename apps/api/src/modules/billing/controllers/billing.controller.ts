import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { BillingService } from '../services/billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  getUsage(@TenantId() tenantId: string) {
    return this.billingService.getCurrentPeriodCount(tenantId).then((documentsCount) => ({
      documentsCount,
    }));
  }
}
