import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ApiKey } from './entities/api-key.entity';
import { ApiRequestLog } from './entities/api-request-log.entity';
import { ApiKeysService } from './services/api-keys.service';
import { ApiRequestLogsService } from './services/api-request-logs.service';
import { ApiKeysController } from './controllers/api-keys.controller';
import { ApiLogsController } from './controllers/api-logs.controller';
import { ApiRequestLogProcessor } from './processors/api-request-log.processor';
import { ApiRequestLoggerInterceptor } from './interceptors/api-request-logger.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, ApiRequestLog]),
    BullModule.registerQueue({
      name: 'api-request-logs',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  controllers: [ApiKeysController, ApiLogsController],
  providers: [
    ApiKeysService,
    ApiRequestLogsService,
    ApiRequestLogProcessor,
    ApiRequestLoggerInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiRequestLoggerInterceptor,
    },
  ],
  exports: [ApiKeysService],
})
export class DevelopersModule {}
