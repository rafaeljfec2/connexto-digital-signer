import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './controllers/tenants.controller';
import { SettingsController } from './controllers/settings.controller';
import { TenantsService } from './services/tenants.service';
import { CertificateService } from './services/certificate.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), UsersModule],
  controllers: [TenantsController, SettingsController],
  providers: [TenantsService, CertificateService],
  exports: [TenantsService, CertificateService],
})
export class TenantsModule {}
