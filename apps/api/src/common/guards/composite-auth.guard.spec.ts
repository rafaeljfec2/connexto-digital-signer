import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CompositeAuthGuard } from './composite-auth.guard';
import { AuthService } from '../../modules/auth/services/auth.service';
import { TenantsService } from '../../modules/tenants/services/tenants.service';
import { ApiKeysService } from '../../modules/developers/services/api-keys.service';
import { CURRENT_USER_KEY, TENANT_ID_KEY, JwtPayload } from '@connexto/shared';
import type { ExecutionContext } from '@nestjs/common';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as ExecutionContext;

describe('CompositeAuthGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let authService: jest.Mocked<AuthService>;
  let tenantsService: jest.Mocked<TenantsService>;
  let apiKeysService: jest.Mocked<ApiKeysService>;
  let guard: CompositeAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    authService = {
      validatePayload: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    tenantsService = {
      validateApiKey: jest.fn(),
    } as unknown as jest.Mocked<TenantsService>;
    apiKeysService = {
      validate: jest.fn(),
      incrementUsage: jest.fn(),
    } as unknown as jest.Mocked<ApiKeysService>;
    guard = new CompositeAuthGuard(reflector, jwtService, authService, tenantsService, apiKeysService);
  });

  test('should allow public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const request = { headers: {} };
    const context = createContext(request);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  test('should validate jwt and attach context', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'owner@acme.com',
      tenantId: 'tenant-1',
      role: 'owner',
      authMethod: 'jwt',
    };
    jwtService.verify.mockReturnValue(payload);
    authService.validatePayload.mockResolvedValue(payload);
    const request = { headers: { authorization: 'Bearer token-1' } };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[CURRENT_USER_KEY as keyof typeof request]).toEqual(payload);
    expect(request[TENANT_ID_KEY as keyof typeof request]).toBe('tenant-1');
  });

  test('should reject when required method does not match', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined).mockReturnValueOnce('api_key');
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'owner@acme.com',
      tenantId: 'tenant-1',
      role: 'owner',
      authMethod: 'jwt',
    };
    jwtService.verify.mockReturnValue(payload);
    const request = { headers: { authorization: 'Bearer token-1' } };
    const context = createContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  test('should validate new api key and attach context with scopes', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    apiKeysService.validate.mockResolvedValue({
      tenantId: 'tenant-9',
      apiKeyId: 'key-id-1',
      scopes: ['documents:read'],
    });
    const request = { headers: { 'x-api-key': 'sk_live_abc123' } };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    const user = request[CURRENT_USER_KEY as keyof typeof request] as unknown as JwtPayload;
    expect(user.tenantId).toBe('tenant-9');
    expect(user.apiKeyId).toBe('key-id-1');
    expect(user.apiKeyScopes).toEqual(['documents:read']);
    expect(apiKeysService.incrementUsage).toHaveBeenCalledWith('key-id-1');
  });

  test('should fallback to legacy api key validation', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    apiKeysService.validate.mockResolvedValue(null);
    tenantsService.validateApiKey.mockResolvedValue({ tenantId: 'tenant-9' });
    const request = { headers: { 'x-api-key': 'key-1' } };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    const user = request[CURRENT_USER_KEY as keyof typeof request] as unknown as JwtPayload;
    expect(user.tenantId).toBe('tenant-9');
    expect(request[TENANT_ID_KEY as keyof typeof request]).toBe('tenant-9');
  });

  test('should reject when both new and legacy api key fail', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    apiKeysService.validate.mockResolvedValue(null);
    tenantsService.validateApiKey.mockResolvedValue(null);
    const request = { headers: { 'x-api-key': 'invalid-key' } };
    const context = createContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
