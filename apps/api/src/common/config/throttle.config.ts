const ttlSeconds = Number.parseInt(process.env['THROTTLE_TTL_SECONDS'] ?? '60', 10);
const publicTtlSeconds = Number.parseInt(
  process.env['THROTTLE_PUBLIC_TTL_SECONDS'] ?? '60',
  10
);

export const throttleConfig = {
  ttlSeconds,
  limit: Number.parseInt(process.env['THROTTLE_LIMIT'] ?? '120', 10),
  publicTtlSeconds,
  publicLimit: Number.parseInt(process.env['THROTTLE_PUBLIC_LIMIT'] ?? '10', 10),
  /** @nestjs/throttler v5+ expects TTL in milliseconds. */
  ttlMs: ttlSeconds * 1000,
  publicTtlMs: publicTtlSeconds * 1000,
} as const;

/** Named throttler override used on public routes. */
export const publicThrottle = {
  default: {
    limit: throttleConfig.publicLimit,
    ttl: throttleConfig.publicTtlMs,
  },
} as const;
