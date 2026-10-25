import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { TENANT_ID_KEY } from '@connexto/shared';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & { [TENANT_ID_KEY]?: string };
    const tenantId = request[TENANT_ID_KEY];
    if (tenantId) return tenantId;
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim() ?? request.ip ?? '';
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0] ?? request.socket?.remoteAddress ?? '';
    }
    return request.ip ?? request.socket?.remoteAddress ?? '';
  }
}
