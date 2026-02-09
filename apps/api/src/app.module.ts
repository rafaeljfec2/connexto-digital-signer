import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './shared/storage/storage.module';
import { PdfModule } from './shared/pdf/pdf.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BillingModule } from './modules/billing/billing.module';
import { AiCoreModule } from './modules/ai-core/ai-core.module';
import { AiFieldsModule } from './modules/ai-fields/ai-fields.module';
import { CompositeAuthGuard } from './common/guards/composite-auth.guard';
import { getLoggerConfig } from './common/config/logger.config';
import { HealthModule } from './modules/health/health.module';
import { throttleConfig } from './common/config/throttle.config';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'apps/api/.env.local',
        'apps/api/.env',
        '.env.local',
        '.env',
      ],
    }),
    LoggerModule.forRoot(getLoggerConfig()),
    HealthModule,
    ThrottlerModule.forRoot({
      ttl: throttleConfig.ttlSeconds,
      limit: throttleConfig.limit,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['DB_HOST'] ?? 'localhost',
      port: Number.parseInt(process.env['DB_PORT'] ?? '5432', 10),
      username: process.env['DB_USERNAME'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? 'postgres',
      database: process.env['DB_DATABASE'] ?? 'connexto_signer',
      autoLoadEntities: true,
      synchronize: false,
      migrations: [join(__dirname, 'database/migrations/*{.ts,.js}')],
      logging: process.env['DB_LOGGING'] === 'true',
      connectTimeoutMS: 5000,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env['REDIS_HOST'] ?? 'localhost',
        port: Number.parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
        ...(process.env['REDIS_PASSWORD'] && {
          password: process.env['REDIS_PASSWORD'],
        }),
      },
    }),
    StorageModule,
    PdfModule,
    AiCoreModule,
    TenantsModule,
    AuthModule,
    DocumentsModule,
    SignaturesModule,
    AuditModule,
    NotificationsModule,
    WebhooksModule,
    BillingModule,
    AiFieldsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CompositeAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
})
export class AppModule {}
