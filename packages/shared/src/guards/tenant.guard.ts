import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TENANT_ID_KEY } from '../decorators/tenant.decorator';
import type { RequestWithTenantId } from '../types/request.types';

export const TENANT_HEADER = 'x-tenant-id';
export const TENANT_QUERY = 'tenantId';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenantId>();
    const tenantId =
      (request.headers[TENANT_HEADER] as string) ??
      (request.query?.[TENANT_QUERY] as string);
    if (!tenantId || typeof tenantId !== 'string') {
      throw new UnauthorizedException('Tenant identifier is required');
    }
    (request as RequestWithTenantId & { [TENANT_ID_KEY]: string })[TENANT_ID_KEY] =
      tenantId.trim();
    return true;
  }
}
