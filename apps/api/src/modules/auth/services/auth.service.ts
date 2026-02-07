import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
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
import { RefreshToken } from '../entities/refresh-token.entity';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
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

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const decodeExpiresIn = (
  jwtService: JwtService,
  token: string
): number => {
  const decoded = jwtService.decode(token);
  if (decoded && typeof decoded === 'object' && 'exp' in decoded && 'iat' in decoded) {
    return (decoded.exp as number) - (decoded.iat as number);
  }
  return 0;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
  ) {}

  async loginWithApiKey(
    apiKey: string
  ): Promise<Omit<LoginResult, 'refreshToken'>> {
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
    const expiresIn = decodeExpiresIn(this.jwtService, accessToken);
    return { accessToken, expiresIn };
  }

  async loginWithEmail(
    email: string,
    password: string,
    metadata: LoginMetadata
  ): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(email);
    if (user === null) {
      await this.emitLoginFailed(email, metadata, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      await this.emitLoginFailed(email, metadata, 'user_inactive');
      throw new UnauthorizedException('Invalid credentials');
    }
    const tenant = await this.tenantsService
      .findOne(user.tenantId)
      .catch(() => null);
    if (!tenant?.isActive) {
      await this.emitLoginFailed(email, metadata, 'tenant_inactive');
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await this.emitLoginFailed(email, metadata, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.createAccessToken(user.id, user.email, user.tenantId, user.role);
    const expiresIn = decodeExpiresIn(this.jwtService, accessToken);

    const refreshToken = await this.createRefreshToken(user.id, user.tenantId);

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
      refreshToken,
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

  async refresh(rawToken: string): Promise<LoginResult> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.revokeAllForUser(stored.userId);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepository.save(stored);

    const user = await this.usersService.findOne(stored.userId);
    if (!user?.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tenant = await this.tenantsService
      .findOne(stored.tenantId)
      .catch(() => null);
    if (!tenant?.isActive) {
      throw new UnauthorizedException('Tenant inactive');
    }

    const accessToken = this.createAccessToken(user.id, user.email, stored.tenantId, user.role);
    const expiresIn = decodeExpiresIn(this.jwtService, accessToken);

    const refreshToken = await this.createRefreshToken(user.id, stored.tenantId);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: stored.tenantId,
      },
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.refreshTokenRepository.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async validatePayload(payload: JwtPayload): Promise<JwtPayload | null> {
    const tenant = await this.tenantsService
      .findOne(payload.tenantId)
      .catch(() => null);
    if (!tenant?.isActive) return null;
    const authMethod = payload.authMethod ?? 'api_key';
    if (authMethod === 'jwt') {
      const user = await this.usersService.findOne(payload.sub);
      if (!user?.isActive) return null;
    }
    return payload;
  }

  private createAccessToken(
    userId: string,
    email: string,
    tenantId: string,
    role: UserRole
  ): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      tenantId,
      role,
      authMethod: 'jwt',
    };
    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(
    userId: string,
    tenantId: string
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const entity = this.refreshTokenRepository.create({
      userId,
      tenantId,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokenRepository.save(entity);
    return raw;
  }

  private async emitLoginFailed(
    email: string,
    metadata: LoginMetadata,
    reason: string
  ): Promise<void> {
    await this.eventEmitter.emitAsync(EVENT_USER_LOGIN_FAILED, {
      email,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      reason,
      attemptedAt: new Date(),
    });
  }
}
