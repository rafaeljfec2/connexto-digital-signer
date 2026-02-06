export const throttleConfig = {
  ttlSeconds: Number.parseInt(process.env['THROTTLE_TTL_SECONDS'] ?? '60', 10),
  limit: Number.parseInt(process.env['THROTTLE_LIMIT'] ?? '120', 10),
  publicTtlSeconds: Number.parseInt(
    process.env['THROTTLE_PUBLIC_TTL_SECONDS'] ?? '60',
    10
  ),
  publicLimit: Number.parseInt(process.env['THROTTLE_PUBLIC_LIMIT'] ?? '10', 10),
} as const;
