import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TENANT_CREATED } from '@connexto/events';
import type { TenantCreatedEvent } from '@connexto/events';
import { FoldersService } from '../services/folders.service';

@Injectable()
export class FoldersEventsHandler {
  private readonly logger = new Logger(FoldersEventsHandler.name);

  constructor(private readonly foldersService: FoldersService) {}

  @OnEvent(EVENT_TENANT_CREATED)
  async handleTenantCreated(payload: TenantCreatedEvent): Promise<void> {
    try {
      await this.foldersService.ensureRootFolder(payload.tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed root folder for tenant ${payload.tenantId}: ${message}`);
    }
  }
}
