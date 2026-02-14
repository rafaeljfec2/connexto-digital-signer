import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import type { JwtPayload } from '@connexto/shared';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { UsersService } from '../../users/services/users.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RefreshToken } from '../entities/refresh-token.entity';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

const buildTenant = (overrides?: Partial<Tenant>): Tenant => ({
  id: 'tenant-1',
  name: 'Acme',
  slug: 'acme',
  branding: null,
  legalTexts: null,
  usageLimits: null,
  apiKeyHash: null,
  isActive: true,
  certificateFileKey: null,
  certificatePasswordEnc: null,
  certificateSubject: null,
  certificateIssuer: null,
  certificateExpiresAt: null,
  certificateConfiguredAt: null,
  defaultSigningLanguage: 'pt-br',
  defaultReminderInterval: 'none',
  defaultClosureMode: 'automatic',
  emailSenderName: null,
  apiKeyLastFour: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'owner@acme.com',
  passwordHash: 'hash-1',
  name: 'Owner',
  role: UserRole.OWNER,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let tenantsService: jest.Mocked<TenantsService>;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;

  beforeEach(() => {
    tenantsService = {
      validateApiKey: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<TenantsService>;
    usersService = {
      create: jest.fn(),
      createOwner: jest.fn(),
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      findByTenantId: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    jwtService = {
      sign: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    eventEmitter = {
      emitAsync: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
    refreshTokenRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<RefreshToken>>;

    service = new AuthService(
      tenantsService,
      usersService,
      jwtService,
      eventEmitter,
      refreshTokenRepository
    );
  });

  describe('loginWithApiKey', () => {
    test('should throw UnauthorizedException when api key is invalid', async () => {
      tenantsService.validateApiKey.mockResolvedValue(null);
      await expect(service.loginWithApiKey('invalid')).rejects.toThrow(UnauthorizedException);
    });

    test('should return token and expiresIn', async () => {
      tenantsService.validateApiKey.mockResolvedValue({ tenantId: 'tenant-1' });
      jwtService.sign.mockReturnValue('token-1');
      jwtService.decode.mockReturnValue({ exp: 200, iat: 100 });

      const result = await service.loginWithApiKey('valid');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'tenant-1',
        email: 'tenant:tenant-1',
        tenantId: 'tenant-1',
        role: 'api_key',
        authMethod: 'api_key',
      });
      expect(result).toEqual({ accessToken: 'token-1', expiresIn: 100 });
    });
  });

  describe('loginWithEmail', () => {
    test('should login and return access token, refresh token, and user data', async () => {
      const user = buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token-1');
      jwtService.decode.mockReturnValue({ exp: 200, iat: 100 });

      const result = await service.loginWithEmail(user.email, 'password', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result.accessToken).toBe('token-1');
      expect(result.expiresIn).toBe(100);
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(result.user).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: 'Acme',
      });
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    test('should throw when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.loginWithEmail('missing@acme.com', 'password', {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    test('should throw when password is invalid', async () => {
      const user = buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValue(false);

      await expect(
        service.loginWithEmail(user.email, 'wrong', {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    test('should throw when token is not found', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    test('should throw and revoke all tokens when token is expired', async () => {
      const expiredToken: RefreshToken = {
        id: 'rt-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        tokenHash: 'hash',
        expiresAt: new Date('2020-01-01'),
        revokedAt: null,
        createdAt: new Date(),
      };
      refreshTokenRepository.findOne.mockResolvedValue(expiredToken);

      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });

    test('should rotate tokens and return new access and refresh tokens', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const storedToken: RefreshToken = {
        id: 'rt-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        tokenHash: 'hash',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
      };
      refreshTokenRepository.findOne.mockResolvedValue(storedToken);
      usersService.findOne.mockResolvedValue(buildUser());
      tenantsService.findOne.mockResolvedValue(buildTenant());
      jwtService.sign.mockReturnValue('new-access-token');
      jwtService.decode.mockReturnValue({ exp: 200, iat: 100 });

      const result = await service.refresh('raw-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(100);
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Owner',
        email: 'owner@acme.com',
        role: UserRole.OWNER,
        tenantId: 'tenant-1',
        tenantName: 'Acme',
      });
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) })
      );
    });

    test('should throw when user is inactive', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const storedToken: RefreshToken = {
        id: 'rt-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        tokenHash: 'hash',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
      };
      refreshTokenRepository.findOne.mockResolvedValue(storedToken);
      usersService.findOne.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeRefreshToken', () => {
    test('should update token as revoked', async () => {
      await service.revokeRefreshToken('raw-token');
      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });
  });

  describe('validatePayload', () => {
    test('should return payload when tenant is active', async () => {
      const payload: JwtPayload = {
        sub: 'tenant-1',
        email: 'tenant:tenant-1',
        tenantId: 'tenant-1',
        role: 'api_key',
        authMethod: 'api_key',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));

      await expect(service.validatePayload(payload)).resolves.toEqual(payload);
    });

    test('should return payload when user and tenant are active', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'owner@acme.com',
        tenantId: 'tenant-1',
        role: UserRole.OWNER,
        authMethod: 'jwt',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));
      usersService.findOne.mockResolvedValue(buildUser({ isActive: true }));

      await expect(service.validatePayload(payload)).resolves.toEqual(payload);
    });

    test('should return null when tenant is inactive', async () => {
      const payload: JwtPayload = {
        sub: 'tenant-1',
        email: 'tenant:tenant-1',
        tenantId: 'tenant-1',
        role: 'api_key',
        authMethod: 'api_key',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: false }));

      await expect(service.validatePayload(payload)).resolves.toBeNull();
    });

    test('should return null when user is inactive', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'owner@acme.com',
        tenantId: 'tenant-1',
        role: UserRole.OWNER,
        authMethod: 'jwt',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));
      usersService.findOne.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.validatePayload(payload)).resolves.toBeNull();
    });
  });
});
