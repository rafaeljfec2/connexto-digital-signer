import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '@connexto/shared';
import { AuthService, LoginResult } from '../services/auth.service';
import { throttleConfig } from '../../../common/config/throttle.config';
import { LoginDto } from '../dto/login.dto';
import type { Request } from 'express';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_USER_LOGOUT } from '@connexto/events';
import { JwtPayload } from '@connexto/shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post('api-key/login')
  async loginWithApiKey(@Body('apiKey') apiKey: string): Promise<LoginResult> {
    return this.authService.loginWithApiKey(apiKey);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post('login')
  async loginWithEmail(
    @Body() body: LoginDto,
    @Req() req: Request
  ): Promise<LoginResult> {
    const ipAddress = req.ip ?? '';
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? '';
    return this.authService.loginWithEmail(body.email, body.password, { ipAddress, userAgent });
  }

  @RequireAuthMethod('jwt')
  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload): Promise<{ ok: true }> {
    await this.eventEmitter.emitAsync(EVENT_USER_LOGOUT, {
      tenantId: user.tenantId,
      userId: user.sub,
      email: user.email,
      logoutAt: new Date(),
    });
    return { ok: true };
  }
}
