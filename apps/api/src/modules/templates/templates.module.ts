import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './entities/template.entity';
import { TemplateDocument } from './entities/template-document.entity';
import { TemplateSigner } from './entities/template-signer.entity';
import { TemplateField } from './entities/template-field.entity';
import { TemplateVariable } from './entities/template-variable.entity';
import { TemplatesService } from './services/templates.service';
import {
  TemplatesController,
  EnvelopeTemplateController,
} from './controllers/templates.controller';
import { DocumentsModule } from '../documents/documents.module';
import { EnvelopesModule } from '../envelopes/envelopes.module';
import { SignaturesModule } from '../signatures/signatures.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      TemplateDocument,
      TemplateSigner,
      TemplateField,
      TemplateVariable,
    ]),
    DocumentsModule,
    forwardRef(() => EnvelopesModule),
    forwardRef(() => SignaturesModule),
  ],
  controllers: [TemplatesController, EnvelopeTemplateController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
