import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { FoldersService } from './services/folders.service';
import { FoldersController } from './controllers/folders.controller';
import { FoldersEventsHandler } from './events/folders.events-handler';

@Module({
  imports: [TypeOrmModule.forFeature([Folder])],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersEventsHandler],
  exports: [FoldersService],
})
export class FoldersModule {}
