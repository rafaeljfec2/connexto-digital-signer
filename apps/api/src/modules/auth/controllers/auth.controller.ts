import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@connexto/shared';
import { AuthService, LoginResult } from '../services/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('api-key/login')
  async loginWithApiKey(@Body('apiKey') apiKey: string): Promise<LoginResult> {
    return this.authService.loginWithApiKey(apiKey);
  }
}
