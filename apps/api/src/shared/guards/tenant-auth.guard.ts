import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, TENANT_ID_KEY } from '@connexto/shared';
import type { RequestWithHeaders } from '@connexto/shared';
import { TenantsService } from '../../modules/tenants/services/tenants.service';

type RequestWithTenantId = RequestWithHeaders & { [TENANT_ID_KEY]?: string };

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly tenantsService: TenantsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithTenantId>();
    const apiKey = request.headers['x-api-key'];
    const rawAuth = request.headers.authorization;
    const bearer = typeof rawAuth === 'string' ? rawAuth : rawAuth?.[0];

    if (apiKey && typeof apiKey === 'string') {
      const result = await this.tenantsService.validateApiKey(apiKey.trim());
      if (result === null) throw new UnauthorizedException('Invalid API key');
      request[TENANT_ID_KEY] = result.tenantId;
      return true;
    }

    if (bearer && typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
      const token = bearer.slice(7);
      try {
        const payload = this.jwtService.verify<{ tenantId: string }>(token);
        request[TENANT_ID_KEY] = payload.tenantId;
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    throw new UnauthorizedException('API key or Bearer token required');
  }
}
