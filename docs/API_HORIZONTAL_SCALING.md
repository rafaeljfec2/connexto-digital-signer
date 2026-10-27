# API horizontal scaling (multi-pod)

The NestJS API is largely **stateless** for HTTP: authentication uses JWT (no server-side session), persistence is PostgreSQL, object storage is S3/MinIO, and async work uses Redis-backed Bull queues. Multiple replicas can sit behind a load balancer without sticky sessions.

Bull workers on every pod are expected: jobs are claimed from Redis. Domain events handled with Nest `EventEmitter2` during a single request stay correct because emit and handlers run in the same process.

Before scaling beyond one replica, address the caveats below.

## Caveat 1 — Cron jobs (mitigated)

`ReminderSchedulerService` registers Nest `@Cron` handlers that run every hour (signature reminders and expired-envelope checks) inside the API process:

- [`apps/api/src/modules/notifications/services/reminder-scheduler.service.ts`](../apps/api/src/modules/notifications/services/reminder-scheduler.service.ts)

### What is in place

| Control | Behavior |
| --- | --- |
| `ENABLE_SCHEDULER` | Unset/`true` (default): register `ScheduleModule` + `ReminderSchedulerService`. `false`: neither is registered; HTTP and Bull workers still run. Boot loads the same `.env` files early (`load-local-env`) so the flag works from file or process env. |
| Redis lock | Keys `nexosign:cron:reminders` and `nexosign:cron:expired-envelopes`, `SET NX PX` with TTL **50 minutes**, token-safe Lua release. Fail-closed: Redis errors skip the tick. |
| PostgreSQL claim | Reminders: conditional `UPDATE` on `reminder_count` then enqueue. Expiration: transactional claim on envelope status (+ `expires_at`) then document status update. |

With **N** replicas and the default flag, at most one pod holds each cron lock per tick; PG claims prevent duplicate effects when two ticks overlap.

### Ops: 1 vs N replicas

- **1 replica:** leave `ENABLE_SCHEDULER=true` (or unset). Locks are harmless.
- **N replicas:** keep the flag enabled on all API pods (preferred), or set `ENABLE_SCHEDULER=false` on all but one role if you want a dedicated scheduler replica.

### Residual risks

- **Crash after claim, before enqueue/send:** the reminder row is already incremented; that interval will not be retried. Prefer fixing the notifications path over rolling back the claim.
- **Tick longer than lock TTL:** unlikely at hourly cadence; if a run exceeds 50 minutes another pod may start a concurrent tick (claims still serialize per row).
- External cron / separate worker Deployment remains optional; not required for multi-pod with the above controls.

## Caveat 2 — In-process EventEmitter and AI memory cache

| Mechanism | Location | Multi-pod behavior |
| --- | --- | --- |
| `EventEmitter2` | Request path modules (auth, documents, signatures, tenants, templates, notifications handlers) | Events are **not** cross-pod. Safe for request-scoped emit → handler; do not rely on another replica receiving an in-memory event. |
| AI cache | `AiCacheService` in-memory `Map` — [`apps/api/src/modules/ai-core/services/ai-cache.service.ts`](../apps/api/src/modules/ai-core/services/ai-cache.service.ts) | Cache is **per pod**. Misses are correct but redundant; no shared invalidation across replicas. |

Related (same class of issue): `@nestjs/throttler` and other in-memory rate limits are per pod (documented under Redis in the root `README.md`). Shared Redis-backed throttling is required for a global limit across replicas.

## Checklist before adding replicas

1. Cron: keep Redis reachable; use default `ENABLE_SCHEDULER` or pin scheduler to one role (Caveat 1)
2. No new business logic that assumes a single process for EventEmitter beyond the request
3. Accept per-pod AI cache / throttling, or move those to Redis
4. Shared Postgres, Redis, and MinIO reachable from every pod with the same env
