import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import type { JwtPayload } from '@connexto/shared';
import { Tenant } from '../../tenants/entities/tenant.entity';

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

describe('AuthService', () => {
  let service: AuthService;
  let tenantsService: jest.Mocked<TenantsService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    tenantsService = {
      validateApiKey: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<TenantsService>;
    jwtService = {
      sign: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new AuthService(tenantsService, jwtService);
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
      });
      expect(result).toEqual({ accessToken: 'token-1', expiresIn: 100 });
    });
  });

  describe('validatePayload', () => {
    test('should return payload when tenant is active', async () => {
      const payload: JwtPayload = {
        sub: 'tenant-1',
        email: 'tenant:tenant-1',
        tenantId: 'tenant-1',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: true }));

      await expect(service.validatePayload(payload)).resolves.toEqual(payload);
    });

    test('should return null when tenant is inactive', async () => {
      const payload: JwtPayload = {
        sub: 'tenant-1',
        email: 'tenant:tenant-1',
        tenantId: 'tenant-1',
      };
      tenantsService.findOne.mockResolvedValue(buildTenant({ isActive: false }));

      await expect(service.validatePayload(payload)).resolves.toBeNull();
    });
  });
});
