import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ApiRequestLoggerInterceptor } from './api-request-logger.interceptor';
import { CURRENT_USER_KEY, TENANT_ID_KEY } from '@connexto/shared';

const mockQueue = {
  add: jest.fn(),
};

const createMockContext = (
  request: Record<string, unknown>,
  response: Record<string, unknown>,
): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => response,
  }),
  getHandler: () => ({}),
  getClass: () => ({}),
}) as unknown as ExecutionContext;

describe('ApiRequestLoggerInterceptor', () => {
  let interceptor: ApiRequestLoggerInterceptor;
  let next: CallHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new ApiRequestLoggerInterceptor(mockQueue as never);
    next = { handle: () => of('result') };
  });

  test('should ignore health check paths', async () => {
    const request = { url: '/health', headers: {}, method: 'GET' };
    const response = { statusCode: 200, getHeader: () => '0' };
    const ctx = createMockContext(request, response);

    await lastValueFrom(interceptor.intercept(ctx, next));
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  test('should ignore swagger paths', async () => {
    const request = { url: '/digital-signer/v1/swagger', headers: {}, method: 'GET' };
    const response = { statusCode: 200, getHeader: () => '0' };
    const ctx = createMockContext(request, response);

    await lastValueFrom(interceptor.intercept(ctx, next));
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  test('should skip logging when no tenantId is present', async () => {
    const request = { url: '/some/path', headers: {}, method: 'GET', socket: { remoteAddress: '127.0.0.1' } };
    const response = { statusCode: 200, getHeader: () => '0' };
    const ctx = createMockContext(request, response);

    await lastValueFrom(interceptor.intercept(ctx, next));
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  test('should enqueue log entry for authenticated requests', async () => {
    const request = {
      url: '/documents',
      headers: { 'user-agent': 'test-agent' },
      method: 'POST',
      socket: { remoteAddress: '10.0.0.1' },
      [CURRENT_USER_KEY]: {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@test.com',
        role: 'owner',
        authMethod: 'jwt' as const,
        apiKeyId: undefined,
      },
      [TENANT_ID_KEY]: 'tenant-1',
    };
    const response = { statusCode: 201, getHeader: () => '512' };
    const ctx = createMockContext(request, response);

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(mockQueue.add).toHaveBeenCalledWith(
      'save',
      expect.objectContaining({
        tenantId: 'tenant-1',
        method: 'POST',
        path: '/documents',
        statusCode: 201,
        ip: '10.0.0.1',
        userAgent: 'test-agent',
      }),
      expect.objectContaining({ removeOnComplete: true }),
    );
  });

  test('should include apiKeyId when present', async () => {
    const request = {
      url: '/envelopes',
      headers: {},
      method: 'GET',
      socket: { remoteAddress: '10.0.0.1' },
      [CURRENT_USER_KEY]: {
        sub: 'tenant-1',
        tenantId: 'tenant-1',
        email: 'tenant:tenant-1',
        role: 'api_key',
        authMethod: 'api_key' as const,
        apiKeyId: 'key-123',
      },
      [TENANT_ID_KEY]: 'tenant-1',
    };
    const response = { statusCode: 200, getHeader: () => '1024' };
    const ctx = createMockContext(request, response);

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(mockQueue.add).toHaveBeenCalledWith(
      'save',
      expect.objectContaining({
        apiKeyId: 'key-123',
      }),
      expect.any(Object),
    );
  });
});
