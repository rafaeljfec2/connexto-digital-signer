import { Controller, Post, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, JwtPayload } from '@connexto/shared';
import { AuthService, LoginResult } from '../services/auth.service';
import { throttleConfig } from '../../../common/config/throttle.config';
import { LoginDto } from '../dto/login.dto';
import { CheckEmailDto } from '../dto/check-email.dto';
import type { Request, Response } from 'express';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_USER_LOGOUT } from '@connexto/events';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/digital-signer/v1/auth',
    maxAge: REFRESH_MAX_AGE_MS,
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/digital-signer/v1/auth',
  });
};

type LoginResponse = Omit<LoginResult, 'refreshToken'>;

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
  async loginWithApiKey(
    @Body('apiKey') apiKey: string
  ): Promise<Omit<LoginResult, 'refreshToken'>> {
    return this.authService.loginWithApiKey(apiKey);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post('check-email')
  async checkEmail(
    @Body() body: CheckEmailDto
  ): Promise<{ exists: boolean }> {
    return this.authService.checkEmailExists(body.email);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post('login')
  async loginWithEmail(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponse> {
    const ipAddress = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const result = await this.authService.loginWithEmail(
      body.email,
      body.password,
      { ipAddress, userAgent }
    );
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...response } = result;
    return response;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponse> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const result = await this.authService.refresh(rawToken);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...response } = result;
    return response;
  }

  @RequireAuthMethod('jwt')
  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ ok: true }> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (rawToken) {
      await this.authService.revokeRefreshToken(rawToken);
    }
    clearRefreshCookie(res);
    await this.eventEmitter.emitAsync(EVENT_USER_LOGOUT, {
      tenantId: user.tenantId,
      userId: user.sub,
      email: user.email,
      logoutAt: new Date(),
    });
    return { ok: true };
  }
}
