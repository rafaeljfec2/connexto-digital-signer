import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { createHash } from 'node:crypto';

interface CacheEntry {
  readonly value: string;
  readonly expiresAt: number;
}

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;

  constructor(
    @InjectQueue('ai-cache')
    private readonly cacheQueue: Queue,
  ) {
    this.defaultTtlMs =
      Number.parseInt(process.env['AI_CACHE_TTL_SECONDS'] ?? '86400', 10) * 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.hashKey(key);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${cacheKey.slice(0, 16)}...`);
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const cacheKey = this.hashKey(key);
    const ttl = ttlMs ?? this.defaultTtlMs;

    this.memoryCache.set(cacheKey, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttl,
    });

    this.logger.debug(`Cache set for key: ${cacheKey.slice(0, 16)}... (ttl: ${String(ttl)}ms)`);
  }

  async invalidate(key: string): Promise<void> {
    const cacheKey = this.hashKey(key);
    this.memoryCache.delete(cacheKey);
    this.logger.debug(`Cache invalidated for key: ${cacheKey.slice(0, 16)}...`);
  }

  buildCacheKey(prefix: string, ...parts: ReadonlyArray<string>): string {
    return `${prefix}:${parts.join(':')}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
