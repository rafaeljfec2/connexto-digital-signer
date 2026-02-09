import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TokenUsage } from '@connexto/ai';
import { AiUsage } from '../entities/ai-usage.entity';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @InjectRepository(AiUsage)
    private readonly aiUsageRepository: Repository<AiUsage>,
  ) {}

  async trackUsage(tenantId: string, usage: TokenUsage): Promise<void> {
    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    try {
      let record = await this.aiUsageRepository.findOne({
        where: { tenantId, periodYear, periodMonth },
      });

      if (record) {
        record.promptTokens += usage.promptTokens;
        record.completionTokens += usage.completionTokens;
        record.totalTokens += usage.totalTokens;
        record.requestCount += 1;
      } else {
        record = this.aiUsageRepository.create({
          tenantId,
          periodYear,
          periodMonth,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          requestCount: 1,
        });
      }

      await this.aiUsageRepository.save(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to track AI usage for tenant ${tenantId}: ${message}`);
    }
  }

  async getUsage(
    tenantId: string,
    periodYear: number,
    periodMonth: number,
  ): Promise<AiUsage | null> {
    return this.aiUsageRepository.findOne({
      where: { tenantId, periodYear, periodMonth },
    });
  }

  async getCurrentMonthUsage(tenantId: string): Promise<AiUsage | null> {
    const now = new Date();
    return this.getUsage(tenantId, now.getFullYear(), now.getMonth() + 1);
  }
}
