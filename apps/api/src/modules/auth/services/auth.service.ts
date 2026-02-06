import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantsService } from '../../tenants/services/tenants.service';
import { JwtPayload } from '@connexto/shared';
import { UsersService } from '../../users/services/users.service';
import bcrypt from 'bcryptjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EVENT_USER_LOGIN_FAILED,
  EVENT_USER_LOGIN_SUCCESS,
} from '@connexto/events';
import { UserRole } from '../../users/entities/user.entity';

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface LoginMetadata {
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2
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
      role: 'api_key',
      authMethod: 'api_key',
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };
    const expiresIn = decoded.exp - decoded.iat;
    return { accessToken, expiresIn };
  }

  async loginWithEmail(
    email: string,
    password: string,
    metadata: LoginMetadata
  ): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    if (user === null) {
      await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_FAILED, {
        email,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        reason: 'invalid_credentials',
        attemptedAt: new Date(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_FAILED, {
        email,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        reason: 'user_inactive',
        attemptedAt: new Date(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const tenant = await this.tenantsService.findOne(user.tenantId).catch(() => null);
    if (tenant === null || !tenant.isActive) {
      await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_FAILED, {
        email,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        reason: 'tenant_inactive',
        attemptedAt: new Date(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_FAILED, {
        email,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        reason: 'invalid_credentials',
        attemptedAt: new Date(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      authMethod: 'jwt',
    };
    const accessToken = this.jwtService.sign(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };
    const expiresIn = decoded.exp - decoded.iat;
    await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_SUCCESS, {
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      loginAt: new Date(),
    });
    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async validatePayload(payload: JwtPayload): Promise<JwtPayload | null> {
    const tenant = await this.tenantsService.findOne(payload.tenantId).catch(() => null);
    if (tenant === null || !tenant.isActive) return null;
    const authMethod = payload.authMethod ?? 'api_key';
    if (authMethod === 'jwt') {
      const user = await this.usersService.findOne(payload.sub);
      if (user === null || !user.isActive) return null;
    }
    return payload;
  }
}
