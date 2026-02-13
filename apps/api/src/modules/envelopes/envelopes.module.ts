import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Envelope } from './entities/envelope.entity';
import { EnvelopesService } from './services/envelopes.service';
import { EnvelopesController } from './controllers/envelopes.controller';
import { FoldersModule } from '../folders/folders.module';
import { TenantsModule } from '../tenants/tenants.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Envelope]),
    FoldersModule,
    TenantsModule,
    DocumentsModule,
  ],
  controllers: [EnvelopesController],
  providers: [EnvelopesService],
  exports: [EnvelopesService],
})
export class EnvelopesModule {}
