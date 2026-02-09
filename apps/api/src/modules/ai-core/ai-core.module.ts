import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AI_GATEWAY_TOKEN, AI_PROVIDER_TOKEN } from '@connexto/ai';
import { AiUsage } from './entities/ai-usage.entity';
import { AiGatewayService } from './services/ai-gateway.service';
import { AiCacheService } from './services/ai-cache.service';
import { AiUsageService } from './services/ai-usage.service';
import { OpenAiProvider } from './providers/openai.provider';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AiUsage]),
    BullModule.registerQueue({
      name: 'ai-cache',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    {
      provide: AI_PROVIDER_TOKEN,
      useClass: OpenAiProvider,
    },
    {
      provide: AI_GATEWAY_TOKEN,
      useClass: AiGatewayService,
    },
    AiGatewayService,
    AiCacheService,
    AiUsageService,
  ],
  exports: [AI_GATEWAY_TOKEN, AiGatewayService, AiCacheService, AiUsageService],
})
export class AiCoreModule {}
