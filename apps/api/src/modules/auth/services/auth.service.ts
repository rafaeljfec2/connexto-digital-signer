import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantsService } from '../../tenants/services/tenants.service';
import { JwtPayload } from '@connexto/shared';

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService
  ) {}

  async loginWithApiKey(apiKey: string): Promise<LoginResult> {
    const result = await this.tenantsService.validateApiKey(apiKey);
    if (result === null) {
      throw new UnauthorizedException('Invalid API key');
    }
    const payload: JwtPayload = {
      sub: result.tenantId,
      email: `tenant:${result.tenantId}`,
      tenantId: result.tenantId,
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };
    const expiresIn = decoded.exp - decoded.iat;
    return { accessToken, expiresIn };
  }

  async validatePayload(payload: JwtPayload): Promise<JwtPayload | null> {
    const tenant = await this.tenantsService.findOne(payload.tenantId);
    if (tenant === null || !tenant.isActive) return null;
    return payload;
  }
}
