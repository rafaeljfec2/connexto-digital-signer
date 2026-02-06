import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../modules/auth/services/auth.service';
import { TenantsService } from '../../modules/tenants/services/tenants.service';
import { IS_PUBLIC_KEY, CURRENT_USER_KEY, TENANT_ID_KEY, JwtPayload } from '@connexto/shared';
import { AUTH_METHOD_KEY, AuthMethod } from '../decorators/auth-method.decorator';
import type { Request } from 'express';

type RequestWithContext = Request & {
  [CURRENT_USER_KEY]?: JwtPayload;
  [TENANT_ID_KEY]?: string;
};

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly tenantsService: TenantsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredMethod = this.reflector.getAllAndOverride<AuthMethod>(AUTH_METHOD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const rawAuth = request.headers.authorization;
    const bearer = typeof rawAuth === 'string' ? rawAuth : rawAuth?.[0];

    if (bearer && bearer.startsWith('Bearer ')) {
      const token = bearer.slice(7);
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(token);
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
      const authMethod =
        payload.authMethod ?? (payload.email.startsWith('tenant:') ? 'api_key' : 'jwt');
      if (requiredMethod && requiredMethod !== authMethod) {
        throw new UnauthorizedException('Invalid auth method');
      }
      const validated = await this.authService.validatePayload({
        ...payload,
        authMethod,
      });
      if (validated === null) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      request[CURRENT_USER_KEY] = validated;
      request[TENANT_ID_KEY] = validated.tenantId;
      return true;
    }

    const apiKey = request.headers['x-api-key'];
    if (apiKey && typeof apiKey === 'string') {
      if (requiredMethod && requiredMethod !== 'api_key') {
        throw new UnauthorizedException('Invalid auth method');
      }
      const result = await this.tenantsService.validateApiKey(apiKey.trim());
      if (result === null) {
        throw new UnauthorizedException('Invalid API key');
      }
      const payload: JwtPayload = {
        sub: result.tenantId,
        email: `tenant:${result.tenantId}`,
        tenantId: result.tenantId,
        role: 'api_key',
        authMethod: 'api_key',
      };
      request[CURRENT_USER_KEY] = payload;
      request[TENANT_ID_KEY] = result.tenantId;
      return true;
    }

    throw new UnauthorizedException('API key or Bearer token required');
  }
}
