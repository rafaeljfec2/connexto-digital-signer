# Digital Signer — Evolution Guide

## Overview

This document describes the evolution roadmap for the Connexto Digital Signer API.
It is organized by priority and dependency order.

---

## Phase 1 — Structure and Quality

### 1.1 Health Check

- Add `/health` endpoint (readiness/liveness)
- Required for Docker healthcheck and Kubernetes probes
- Must verify connectivity to Postgres and Redis

### 1.2 DTO Decorators in Swagger

- Add `@ApiProperty()` to all DTOs (`CreateTenantDto`, `CreateDocumentDto`, `CreateSignerDto`, etc.)
- Ensures Swagger/Scalar shows field names, types, descriptions, and examples

### 1.3 Unit Tests

- Start with `SignaturesService` (most critical business rules)
- Cover: addSigner, acceptSignature, areAllSignersSigned, finalizeDocument
- Edge cases: already signed, expired document, completed document
- Then expand to `DocumentsService`, `TenantsService`, `AuthService`

### 1.4 Global Exception Filter

- Create a global HTTP exception filter
- Standardize error shape: `{ statusCode, message, error, timestamp }`
- Handle TypeORM errors (duplicate key, not found) gracefully

### 1.5 CORS

- Configure CORS in `main.ts` for frontend consumption
- Use an environment variable for allowed origins

---

## Phase 2 — Robustness

### 2.1 TypeORM Migrations

- Replace `synchronize: true` with versioned migrations
- Generate initial migration from current entities
- Add scripts to `package.json` (`migration:generate`, `migration:run`, `migration:revert`)

### 2.2 Rate Limiting

- Add `@nestjs/throttler` for rate limiting
- Protect public endpoints (`/sign/:token`, `/auth/api-key/login`, `/tenants`)
- Configure limits per tenant and per IP

### 2.3 Integration Tests

- Full flow: create tenant → create document → add signer → sign → validate final PDF
- Use `@nestjs/testing` with a test database
- Verify events are emitted correctly

### 2.4 CI Pipeline

- GitHub Actions workflow
- Steps: install → lint → test → build
- Run on push to `main` and on pull requests

---

## Phase 3 — Product Features

### 3.1 Signing Frontend

- Public page where the signer views and accepts the document
- Accessible via `/sign/:token`
- Mobile-first design
- Show document preview, signer data, and consent checkbox

### 3.2 Email Notifications

- Implement real delivery via nodemailer
- Templates: signer invite, signature completed, document finalized
- Enqueue email via Bull for reliability and retry

### 3.3 Webhook Delivery

- Bull processor that POSTs events to configured URLs
- Retry with exponential backoff
- Sign payload with webhook secret (HMAC)
- Log attempts and delivery status

### 3.4 End-to-End Storage

- Verify MinIO upload/download for the full flow
- Presigned URLs for document download
- Auto-create bucket on startup (dev only)

---

## Phase 4 — Production Readiness

### 4.1 Observability

- Structured logs in production (JSON via Pino)
- Add request correlation ID (`x-request-id`)
- Metrics endpoint (Prometheus format)
- Distributed tracing (OpenTelemetry)

### 4.2 Security Hardening

- Helmet middleware
- Input sanitization
- API key rotation mechanism
- Audit log for sensitive operations
- Dependency vulnerability scanning

### 4.3 Performance

- Database connection pool tuning
- Redis cache for tenant configuration
- Pagination on list endpoints
- File upload size limits

### 4.4 Multi-Environment

- Staging environment configuration
- Feature flags
- Blue/green or canary deploy strategy
- Database backup strategy

---

## Current State

### Completed

- [x] Project structure (pnpm monorepo + Turborepo)
- [x] NestJS API with modules: auth, tenants, documents, signatures, audit, notifications, webhooks, billing
- [x] TypeORM entities with indexes
- [x] User entity (roles: owner/admin/member) and bcryptjs password
- [x] Email/password login (POST `/auth/login`) + logout (POST `/auth/logout`)
- [x] Unified auth guard (JWT + API Key) with `@RequireAuthMethod`
- [x] Auth audit (login success/failed, logout)
- [x] Versioned migrations with `runMigrations()` on startup
- [x] Docker setup (Postgres, Redis, MinIO)
- [x] Logger (NestJS + Pino with pino-pretty)
- [x] Swagger UI + Scalar UI
- [x] Global route prefix (`/digital-signer/v1`)
- [x] Swagger grouping via `@ApiTags`
- [x] Business logic: add signer, accept signature, finalize document with evidence page
- [x] Next.js 14 frontend (App Router) with Tailwind + i18n (en/pt-br)
- [x] Screens: Login, Signup (auto slug + password policy), Dashboard shell
- [x] Axios API client + route protection middleware

### Architecture

```
apps/
  api/                          # NestJS API
    src/
      common/config/            # Logger config
      modules/
        auth/                   # API key + JWT auth
        users/                  # Users and roles
        tenants/                # Multi-tenant
        documents/              # Document CRUD + storage
        signatures/             # Signer management + signing flow
        audit/                  # Audit log (event-driven)
        notifications/          # Email notifications (Bull)
        webhooks/               # Webhook config + delivery (Bull)
        billing/                # Usage/consumption (event-driven)
      shared/
        guards/                 # Tenant guard
        pdf/                    # PDF handling (pdf-lib)
        storage/                # S3-compatible storage
  web/                          # Next.js frontend (Auth + Dashboard)
packages/
  shared/                       # Shared decorators and types
  database/                     # Database utilities
  events/                       # Event constants and types
docker/
  docker-compose.yml            # Postgres, Redis, MinIO, API
  Dockerfile                    # Multi-stage Node 24 build
```

### API Endpoints

| Group      | Method | Route                                           |
|------------|--------|-------------------------------------------------|
| Tenants    | POST   | `/digital-signer/v1/tenants`                    |
| Tenants    | GET    | `/digital-signer/v1/tenants/:id`                |
| Tenants    | PATCH  | `/digital-signer/v1/tenants/:id`                |
| Auth       | POST   | `/digital-signer/v1/auth/api-key/login`         |
| Auth       | POST   | `/digital-signer/v1/auth/login`                 |
| Auth       | POST   | `/digital-signer/v1/auth/logout`                |
| Documents  | POST   | `/digital-signer/v1/documents`                  |
| Documents  | GET    | `/digital-signer/v1/documents/:id`              |
| Documents  | PATCH  | `/digital-signer/v1/documents/:id`              |
| Signers    | POST   | `/digital-signer/v1/documents/:documentId/signers` |
| Signers    | GET    | `/digital-signer/v1/documents/:documentId/signers` |
| Sign       | GET    | `/digital-signer/v1/sign/:token`                |
| Sign       | POST   | `/digital-signer/v1/sign/:token/accept`         |
| Audit      | GET    | `/digital-signer/v1/audit/entities/:entityType/:entityId` |
| Webhooks   | POST   | `/digital-signer/v1/webhooks/configs`           |
| Webhooks   | GET    | `/digital-signer/v1/webhooks/configs`           |
| Billing    | GET    | `/digital-signer/v1/billing/usage`              |

### Documentation URLs (dev only)

- Swagger UI: `http://localhost:3000/digital-signer/v1/swagger`
- Scalar UI: `http://localhost:3000/digital-signer/v1/reference`
