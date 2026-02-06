import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditController } from './controllers/audit.controller';
import { AuditService } from './services/audit.service';
import { AuditEventsHandler } from './events/audit.events-handler';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditEventsHandler],
  exports: [AuditService],
})
export class AuditModule {}
