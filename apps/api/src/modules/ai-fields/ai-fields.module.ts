import { Logger, Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { AiFieldsController } from './controllers/ai-fields.controller';
import { AiFieldsService } from './services/ai-fields.service';

@Module({
  imports: [DocumentsModule],
  controllers: [AiFieldsController],
  providers: [
    AiFieldsService,
    {
      provide: Logger,
      useValue: new Logger(AiFieldsService.name),
    },
  ],
  exports: [AiFieldsService],
})
export class AiFieldsModule {}
