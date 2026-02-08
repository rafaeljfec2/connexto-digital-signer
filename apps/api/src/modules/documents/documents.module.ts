import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: Logger,
      useValue: new Logger(DocumentsService.name),
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
