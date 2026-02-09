import { Controller, Post, Param, ParseUUIDPipe, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantId } from '@connexto/shared';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { AiFieldsService } from '../services/ai-fields.service';
import type { SuggestFieldsResponse } from '../dto/suggest-fields-response.dto';

@ApiTags('AI - Field Suggestions')
@RequireAuthMethod('jwt')
@Controller('documents')
export class AiFieldsController {
  constructor(private readonly aiFieldsService: AiFieldsService) {}

  @Post(':id/ai/suggest-fields')
  async suggestFields(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
    @Query('signerCount', ParseIntPipe) signerCount: number,
  ): Promise<SuggestFieldsResponse> {
    return this.aiFieldsService.suggestFields(documentId, tenantId, signerCount);
  }
}
