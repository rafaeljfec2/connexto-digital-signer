import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signer } from './entities/signer.entity';
import { SignatureField } from './entities/signature-field.entity';
import { TenantSigner } from './entities/tenant-signer.entity';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantsModule } from '../tenants/tenants.module';
import {
  SignersListController,
  SignaturesController,
  SignController,
  SignatureFieldsController,
  DocumentSendController,
} from './controllers/signatures.controller';
import { TenantSignerController } from './controllers/tenant-signer.controller';
import { SignaturesService } from './services/signatures.service';
import { SignatureFieldsService } from './services/signature-fields.service';
import { TenantSignerService } from './services/tenant-signer.service';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signer, SignatureField, TenantSigner]),
    DocumentsModule,
    NotificationsModule,
    TenantsModule,
  ],
  controllers: [
    SignersListController,
    SignaturesController,
    SignatureFieldsController,
    DocumentSendController,
    SignController,
    TenantSignerController,
  ],
  providers: [
    SignaturesService,
    SignatureFieldsService,
    TenantSignerService,
    VerificationService,
  ],
  exports: [SignaturesService, TenantSignerService],
})
export class SignaturesModule {}
