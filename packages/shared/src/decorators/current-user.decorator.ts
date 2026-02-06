import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  authMethod: 'jwt' | 'api_key';
}

export const CURRENT_USER_KEY = 'user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ [CURRENT_USER_KEY]: JwtPayload }>();
    const user = request[CURRENT_USER_KEY];
    if (user === undefined) {
      throw new Error('User not found in request context');
    }
    return user;
  }
);
