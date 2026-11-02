# Digital Signer — Evolution Guide

## Overview

This document tracks **engineering** evolution for the Connexto Digital Signer API and web app: quality, robustness, and production readiness.

**Product status, gaps, and unordered opportunities** live in [`ROADMAP_FUTURO.md`](ROADMAP_FUTURO.md). Detailed evidence (Portuguese): [`reports/discovery/`](../reports/discovery/).

Items marked `[x]` are present in the codebase as of the 2026-11-02 status sync (revision `37c8036`). Remaining `[ ]` items are still engineering work.

---

## Phase 1 — Structure and Quality

### 1.1 Health Check

- [x] `/digital-signer/v1/health` (readiness: Postgres + Redis) and `/health/live` (liveness)
- [x] Docker / FlowDeploy healthcheck uses liveness (see `paasdeploy.json`)
- Note: readiness verifies DB/Redis; production probe currently points at live

### 1.2 DTO Decorators in Swagger

- [x] OpenAPI/Swagger grouping via `@ApiTags` and DTO `@ApiProperty` on main modules
- [~] Docs UI only when `API_DOCS_ENABLED=true` (Scalar/Swagger paths under the API prefix)

### 1.3 Unit Tests

- [x] Substantial `apps/api` unit suite (~40 `*.spec.ts`): signatures/dispatch, documents, PDF/CAdES, auth, webhooks, reminders/locks, templates, folders, etc.
- [ ] Web app unit/component tests (`apps/web` has none)
- [ ] Dedicated specs for `ai-fields` / `ai-core`, billing enforcement, certificate upload path
- [ ] Spec covering sequential reminders with `notifiedAt = null` (known defect)

### 1.4 Global Exception Filter

- [ ] Dedicated global HTTP exception filter with a single error envelope
- Note: Nest defaults + `ValidationPipe` (whitelist, forbidNonWhitelisted) are in use

### 1.5 CORS

- [x] CORS configured for frontend consumption via environment

---

## Phase 2 — Robustness

### 2.1 TypeORM Migrations

- [x] `synchronize: false` in app and data source
- [x] Versioned migrations under `apps/api/src/database/migrations/`
- [x] CLI scripts + boot-time `runBootMigrations` (fail-soft after listen so healthchecks pass)

### 2.2 Rate Limiting

- [x] `@nestjs/throttler` + `TenantThrottlerGuard`
- [x] Extra throttle on public auth/signup paths
- Note: store is in-memory (see horizontal scaling caveats)

### 2.3 Integration Tests

- [ ] Full E2E against a test database: tenant → draft → upload → send → sign → assert final PDF
- [ ] Multi-instance cron lock integration test

### 2.4 CI Pipeline

- [x] Lint/test/build tooling in the monorepo (pnpm + Turborepo)
- Confirm workflow coverage on every push/PR against the current package set as needed

---

## Phase 3 — Product Features (engineering delivery)

### 3.1 Signing Frontend

- [x] Public `/sign/:token` flow (identify, view, fill, OTP, review, success)
- [~] Mobile-oriented CSS present; device UX **UNVERIFIED** in discovery
- Product gaps (resend invite, decline, distinct expired messaging): see [`ROADMAP_FUTURO.md`](ROADMAP_FUTURO.md)

### 3.2 Email Notifications

- [x] Real delivery via **MailerSend** SDK (not nodemailer/SMTP)
- [x] Bull `notifications` queue with retries
- [x] Templates: invite, reminder, document completed, welcome, verification code
- Note: non-production may use logger/in-memory driver when no API key is set

### 3.3 Webhook Delivery

- [x] Bull `webhooks` processor, HMAC signature, delivery logs, manual retry
- [ ] Align DTO event examples with emitters; event idempotency key
- [ ] Wire `document.expired` emission on the cron expiry path (method exists, cron does not call it)

### 3.4 End-to-End Storage

- [x] S3/MinIO put/get/stream for original, final, and `.p7s`
- [x] File magic-byte validation and size limits
- [~] Presigned URLs available in storage service; prefer authenticated download routes in product UI

---

## Phase 4 — Production Readiness

### 4.1 Observability

- [x] Structured logs (nestjs-pino / Pino)
- [x] API request logging queue + developers UI
- [ ] Standard `x-request-id` correlation across all layers
- [ ] Prometheus metrics endpoint
- [ ] OpenTelemetry tracing

### 4.2 Security Hardening

- [x] Composite JWT + API key guard; refresh token rotation; audit events for auth and signing
- [x] Optional tenant A1 certificate for PAdES / CAdES
- [ ] Helmet middleware
- [ ] Broader input sanitization policy
- [ ] Enforce API key scopes (`hasScope` exists unused)
- [ ] Apply `UserRole` RBAC when members exist
- [ ] Dependency vulnerability scanning as a required CI gate

### 4.3 Performance

- [x] Pagination on envelope/list endpoints
- [x] File upload size limits
- [ ] Shared Redis cache for tenant config / AI suggestions (AI cache is in-process `Map`)
- [ ] Pool tuning documented per environment

### 4.4 Multi-Environment

- [x] Production FlowDeploy app (`connexto-digital-signer-api`)
- [ ] Explicit staging environment and promote path
- [ ] Feature flags
- [ ] Blue/green or canary
- [ ] Documented backup/restore for Postgres + object storage

Multi-pod cron and EventEmitter caveats: [`API_HORIZONTAL_SCALING.md`](API_HORIZONTAL_SCALING.md).

---

## Current State

### Completed (high level)

- [x] pnpm workspaces + Turborepo monorepo
- [x] NestJS API modules: auth, users, tenants, documents, envelopes, folders, signatures, templates, audit, notifications, webhooks, billing, developers, ai-core, ai-fields, health
- [x] Envelope-centric signing (draft → fields → send → public accept → finalize with evidence)
- [x] TypeORM entities + versioned migrations (`synchronize: false`)
- [x] JWT + refresh cookies + API keys (developer table + legacy tenant key); `@RequireAuthMethod`
- [x] MailerSend + Bull; webhook HMAC delivery; Redis distributed locks for hourly cron
- [x] Next.js 14 App Router, Tailwind, next-intl (`pt-br` / `en`)
- [x] Web: login/signup, overview KPIs, document wizard, folders, signers, templates, historico, settings, developers, public sign + success
- [x] Axios client + middleware cookie gate for authenticated routes

### Known engineering defects (do not treat as done)

Documented in [`ROADMAP_FUTURO.md`](ROADMAP_FUTURO.md) and [`reports/discovery/06-technical-assessment.md`](../reports/discovery/06-technical-assessment.md):

- Sequential reminder cron vs sequential invite rules
- Partial-signature expiry → `completed` without final PDF
- `closeDocument` without PDF / without controller
- Reminder claim without rollback on send failure

### Architecture

```
apps/
  api/                          # NestJS API
    src/
      modules/
        auth/                   # JWT, refresh, API key login
        users/                  # Owner user creation (no public controller)
        tenants/                # Tenancy + settings (certificate, branding, defaults)
        envelopes/              # Envelope CRUD, draft, stats
        documents/              # Document CRUD + file streams
        folders/                # Folder tree + Documentos seed
        signatures/             # Signers, fields, dispatch, public sign
        templates/              # Reusable templates
        audit/                  # Audit log + history APIs
        notifications/          # MailerSend + Bull + reminder cron
        webhooks/               # Outbound webhooks + Bull
        developers/             # API keys + request logs
        billing/                # Monthly document usage counter
        ai-core/ / ai-fields/   # OpenAI gateway + field suggestions
      shared/
        pdf/                    # pdf-lib embed, evidence, PAdES/CAdES helpers
        storage/                # S3-compatible storage
        distributed-lock/       # Redis SET NX locks
  web/                          # Next.js (dashboard + public signing)
packages/
  shared/                       # Decorators, types, guards helpers
  database/                     # Data source helpers
  events/                       # Event constants and payloads
  ai/                           # Shared AI package
docker/
  docker-compose.yml            # Local Postgres, Redis, MinIO
```

### API surface (groups)

Prefix: `/digital-signer/v1`. Full schemas when `API_DOCS_ENABLED=true` (Swagger/Scalar).

| Group | Representative routes |
| --- | --- |
| Health | `GET /health`, `GET /health/live` |
| Auth | `POST /auth/login`, `/refresh`, `/logout`, `/check-email`, `/api-key/login` |
| Tenants / settings | `POST/GET/PATCH /tenants`, `/settings/*` (certificate, branding, defaults, notifications, legacy API key) |
| Envelopes | `POST /envelopes`, `/envelopes/draft`, `GET /envelopes`, `/envelopes/stats`, send/preview/tracking/summary under `/envelopes/:id` |
| Documents / fields | `POST /documents`, file upload/download, `/documents/:id/fields`, AI suggest |
| Folders | `GET/POST/PATCH/DELETE /folders` |
| Sign (public) | `GET/POST /sign/:token/*` (pdf, fields, identify, OTP, accept, summary) |
| Tenant signers | `/tenant-signers` |
| Templates | `/templates`, `POST /envelopes/:id/template` |
| Webhooks | `/webhooks/configs`, deliveries, retry |
| Developers | `/developers/api-keys`, `/developers/logs` |
| Audit / billing | `/audit/history*`, `GET /billing/usage` |

**Note:** Core envelope/document/signer send path uses `@RequireAuthMethod('jwt')`. Templates and webhooks accept JWT or API key. Scopes are not enforced on routes.

### Documentation URLs

- Swagger / Scalar: enabled only when `API_DOCS_ENABLED=true` (paths under `/digital-signer/v1/` as configured in `main.ts`)
- Product docs index: [`docs/README.md`](README.md)
