import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TENANT_ID_KEY = 'tenantId';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ [TENANT_ID_KEY]: string }>();
    const tenantId = request[TENANT_ID_KEY];
    if (tenantId === undefined) {
      throw new Error('TenantId not found in request context');
    }
    return tenantId;
  }
);
