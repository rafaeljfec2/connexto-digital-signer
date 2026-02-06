import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '@connexto/shared';
import { AuthService, LoginResult } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('api-key/login')
  async loginWithApiKey(@Body('apiKey') apiKey: string): Promise<LoginResult> {
    return this.authService.loginWithApiKey(apiKey);
  }
}
