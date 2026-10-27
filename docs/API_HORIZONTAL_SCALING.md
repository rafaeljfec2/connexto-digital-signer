# API horizontal scaling (multi-pod)

The NestJS API is largely **stateless** for HTTP: authentication uses JWT (no server-side session), persistence is PostgreSQL, object storage is S3/MinIO, and async work uses Redis-backed Bull queues. Multiple replicas can sit behind a load balancer without sticky sessions.

Bull workers on every pod are expected: jobs are claimed from Redis. Domain events handled with Nest `EventEmitter2` during a single request stay correct because emit and handlers run in the same process.

Before scaling beyond one replica, address the caveats below.

## Caveat 1 — Cron jobs run on every pod

`ReminderSchedulerService` registers Nest `@Cron` handlers that run every hour (signature reminders and expired-envelope checks) inside the API process:

- [`apps/api/src/modules/notifications/services/reminder-scheduler.service.ts`](../apps/api/src/modules/notifications/services/reminder-scheduler.service.ts)

With **N** replicas, each cron fires **N** times unless coordination is added. That can duplicate reminder emails and race envelope status updates.

**Mitigations (pick one before multi-pod production):**

- Distributed lock (e.g. Redis) so only one pod runs each tick
- Dedicated worker Deployment that owns `@Cron` (API pods disable the scheduler)
- Move schedules to a single external cron / queue producer

## Caveat 2 — In-process EventEmitter and AI memory cache

| Mechanism | Location | Multi-pod behavior |
| --- | --- | --- |
| `EventEmitter2` | Request path modules (auth, documents, signatures, tenants, templates, notifications handlers) | Events are **not** cross-pod. Safe for request-scoped emit → handler; do not rely on another replica receiving an in-memory event. |
| AI cache | `AiCacheService` in-memory `Map` — [`apps/api/src/modules/ai-core/services/ai-cache.service.ts`](../apps/api/src/modules/ai-core/services/ai-cache.service.ts) | Cache is **per pod**. Misses are correct but redundant; no shared invalidation across replicas. |

Related (same class of issue): `@nestjs/throttler` and other in-memory rate limits are per pod (documented under Redis in the root `README.md`). Shared Redis-backed throttling is required for a global limit across replicas.

## Checklist before adding replicas

1. Cron coordination (Caveat 1) implemented or scheduler disabled on all but one role
2. No new business logic that assumes a single process for EventEmitter beyond the request
3. Accept per-pod AI cache / throttling, or move those to Redis
4. Shared Postgres, Redis, and MinIO reachable from every pod with the same env
