import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
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
import { TenantAuthGuard } from './shared/guards/tenant-auth.guard';
import { getLoggerConfig } from './common/config/logger.config';

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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      username: process.env['DB_USERNAME'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? 'postgres',
      database: process.env['DB_DATABASE'] ?? 'connexto_signer',
      autoLoadEntities: true,
      synchronize: process.env['NODE_ENV'] !== 'production',
      logging: process.env['DB_LOGGING'] === 'true',
      connectTimeoutMS: 5000,
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env['REDIS_HOST'] ?? 'localhost',
        port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
        ...(process.env['REDIS_PASSWORD'] && {
          password: process.env['REDIS_PASSWORD'],
        }),
      },
    }),
    StorageModule,
    PdfModule,
    TenantsModule,
    AuthModule,
    DocumentsModule,
    SignaturesModule,
    AuditModule,
    NotificationsModule,
    WebhooksModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantAuthGuard,
    },
  ],
})
export class AppModule {}
