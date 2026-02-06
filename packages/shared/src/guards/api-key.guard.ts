import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TENANT_ID_KEY } from '../decorators/tenant.decorator';
import type { RequestWithHeaders } from '../types/request.types';

export const API_KEY_HEADER = 'x-api-key';

export interface ApiKeyValidationResult {
  tenantId: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly validateApiKey: (
      apiKey: string
    ) => Promise<ApiKeyValidationResult | null>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const apiKey = request.headers[API_KEY_HEADER] as string;
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('API key is required');
    }
    const result = await this.validateApiKey(apiKey.trim());
    if (result === null) {
      throw new UnauthorizedException('Invalid API key');
    }
    (request as RequestWithHeaders & { [TENANT_ID_KEY]: string })[TENANT_ID_KEY] =
      result.tenantId;
    return true;
  }
}
