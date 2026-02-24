import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Observable, tap } from 'rxjs';
import { CURRENT_USER_KEY, TENANT_ID_KEY, JwtPayload } from '@connexto/shared';
import type { Request, Response } from 'express';

const IGNORED_PATHS = new Set(['/health', '/digital-signer/v1/docs', '/digital-signer/v1/swagger']);

@Injectable()
export class ApiRequestLoggerInterceptor implements NestInterceptor {
  constructor(
    @InjectQueue('api-request-logs')
    private readonly logQueue: Queue,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;

    if (this.shouldIgnore(path)) {
      return next.handle();
    }

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.enqueueLog(request, context, start),
        error: () => this.enqueueLog(request, context, start),
      }),
    );
  }

  private shouldIgnore(path: string): boolean {
    for (const ignored of IGNORED_PATHS) {
      if (path.startsWith(ignored)) return true;
    }
    return path.includes('/swagger') || path.includes('/docs');
  }

  private enqueueLog(
    request: Request,
    context: ExecutionContext,
    start: number,
  ): void {
    const response = context.switchToHttp().getResponse<Response>();
    const reqRecord = request as unknown as Record<string, unknown>;
    const user = reqRecord[CURRENT_USER_KEY] as JwtPayload | undefined;
    const tenantId = reqRecord[TENANT_ID_KEY] as string | undefined;

    if (tenantId === undefined) return;

    const duration = Date.now() - start;
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request.socket.remoteAddress
      ?? null;

    void this.logQueue.add('save', {
      tenantId,
      apiKeyId: user?.apiKeyId ?? null,
      method: request.method,
      path: request.url,
      statusCode: response.statusCode,
      duration,
      ip,
      userAgent: (request.headers['user-agent'] as string) ?? null,
      responseSize: Number(response.getHeader('content-length') ?? '0'),
    }, { removeOnComplete: true, removeOnFail: true });
  }
}
