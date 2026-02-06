import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signer } from './entities/signer.entity';
import { DocumentsModule } from '../documents/documents.module';
import { SignaturesController, SignController } from './controllers/signatures.controller';
import { SignaturesService } from './services/signatures.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signer]),
    DocumentsModule,
  ],
  controllers: [SignaturesController, SignController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
