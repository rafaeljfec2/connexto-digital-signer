import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { TENANT_ID_KEY } from '@connexto/shared';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): string {
    const tenantId = (req as Request & { [TENANT_ID_KEY]?: string })[TENANT_ID_KEY];
    if (tenantId) return tenantId;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() ?? req.ip;
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0] ?? req.socket?.remoteAddress ?? '';
    }
    return req.ip ?? req.socket?.remoteAddress ?? '';
  }
}
