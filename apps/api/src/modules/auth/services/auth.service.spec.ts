import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import type { JwtPayload } from '@connexto/shared';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { UsersService } from '../../users/services/users.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    service = new AuthService(tenantsService, usersService, jwtService, eventEmitter);
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
    test('should login and return token with user data', async () => {
      const user = buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));
      jest.mocked(bcrypt.compare).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token-1');
      jwtService.decode.mockReturnValue({ exp: 200, iat: 100 });

      const result = await service.loginWithEmail(user.email, 'password', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result).toEqual({
        accessToken: 'token-1',
        expiresIn: 100,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      });
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
      jest.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(
        service.loginWithEmail(user.email, 'wrong', {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        })
      ).rejects.toThrow(UnauthorizedException);
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
