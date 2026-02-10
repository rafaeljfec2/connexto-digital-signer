import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signer } from './entities/signer.entity';
import { SignatureField } from './entities/signature-field.entity';
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
import { SignaturesService } from './services/signatures.service';
import { SignatureFieldsService } from './services/signature-fields.service';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signer, SignatureField]),
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
  ],
  providers: [SignaturesService, SignatureFieldsService, VerificationService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
