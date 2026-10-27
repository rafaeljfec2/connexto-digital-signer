import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signer } from './entities/signer.entity';
import { SignatureField } from './entities/signature-field.entity';
import { TenantSigner } from './entities/tenant-signer.entity';
import { DocumentsModule } from '../documents/documents.module';
import { EnvelopesModule } from '../envelopes/envelopes.module';
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
import { EnvelopeAuditService } from './services/envelope-audit.service';
import { EnvelopeDispatchService } from './services/envelope-dispatch.service';
import { SignatureFieldsService } from './services/signature-fields.service';
import { SignaturesService } from './services/signatures.service';
import { SigningFlowService } from './services/signing-flow.service';
import { TenantSignerService } from './services/tenant-signer.service';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signer, SignatureField, TenantSigner]),
    DocumentsModule,
    EnvelopesModule,
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
    SigningFlowService,
    EnvelopeDispatchService,
    EnvelopeAuditService,
    SignatureFieldsService,
    TenantSignerService,
    VerificationService,
  ],
  exports: [
    SignaturesService,
    EnvelopeDispatchService,
    SignatureFieldsService,
    TenantSignerService,
  ],
})
export class SignaturesModule {}
