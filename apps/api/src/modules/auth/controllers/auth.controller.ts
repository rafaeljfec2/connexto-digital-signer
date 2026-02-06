import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@connexto/shared';
import { AuthService, LoginResult } from '../services/auth.service';
import { throttleConfig } from '../../../common/config/throttle.config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post('api-key/login')
  async loginWithApiKey(@Body('apiKey') apiKey: string): Promise<LoginResult> {
    return this.authService.loginWithApiKey(apiKey);
  }
}
