import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingUsage } from './entities/billing-usage.entity';
import { BillingController } from './controllers/billing.controller';
import { BillingService } from './services/billing.service';
import { BillingEventsHandler } from './events/billing.events-handler';

@Module({
  imports: [TypeOrmModule.forFeature([BillingUsage])],
  controllers: [BillingController],
  providers: [BillingService, BillingEventsHandler],
  exports: [BillingService],
})
export class BillingModule {}
