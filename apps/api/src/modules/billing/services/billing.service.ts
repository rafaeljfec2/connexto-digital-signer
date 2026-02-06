import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingUsage } from '../entities/billing-usage.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingUsage)
    private readonly billingRepository: Repository<BillingUsage>
  ) {}

  async incrementDocumentCount(tenantId: string): Promise<void> {
    const now = new Date();
    const periodYear = now.getUTCFullYear();
    const periodMonth = now.getUTCMonth() + 1;
    let usage = await this.billingRepository.findOne({
      where: { tenantId, periodYear, periodMonth },
    });
    if (usage === null) {
      usage = this.billingRepository.create({
        tenantId,
        periodYear,
        periodMonth,
        documentsCount: 0,
      });
      await this.billingRepository.save(usage);
    }
    usage.documentsCount += 1;
    await this.billingRepository.save(usage);
  }

  async getCurrentPeriodCount(tenantId: string): Promise<number> {
    const now = new Date();
    const periodYear = now.getUTCFullYear();
    const periodMonth = now.getUTCMonth() + 1;
    const usage = await this.billingRepository.findOne({
      where: { tenantId, periodYear, periodMonth },
    });
    return usage?.documentsCount ?? 0;
  }
}
