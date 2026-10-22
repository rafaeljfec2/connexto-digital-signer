# NexoSign Digital Signer

Modular NestJS monolith (Node.js + TypeScript) for digital document signing, built for multi-tenant, white-label, auditability, and future extraction into microservices.

## Stack

- **Runtime:** Node.js 24+, TypeScript 5.x
- **Framework:** NestJS 10
- **ORM:** TypeORM 0.3 + PostgreSQL
- **Queues:** Redis + Bull
- **Storage:** S3-compatible (MinIO in dev, AWS S3 or compatible in production)
- **Auth:** JWT (short-lived) + API Key per tenant
- **PDF:** pdf-lib (evidence page generation, SHA-256 hash)
- **Monorepo:** pnpm + Turborepo

## Repository structure

```
connexto-digital-signer/
├── apps/
│   └── api/                    # NestJS application
│       └── src/
│           ├── modules/        # Bounded contexts
│           │   ├── auth/
│           │   ├── tenants/
│           │   ├── documents/
│           │   ├── signatures/
│           │   ├── audit/
│           │   ├── notifications/
│           │   ├── webhooks/
│           │   └── billing/
│           ├── shared/         # Storage, PDF, guards
│           ├── app.module.ts
│           └── main.ts
├── packages/
│   ├── shared/                 # Utils, decorators, guards, interfaces
│   ├── database/               # TypeORM config (optional)
│   └── events/                 # Domain event types and names
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Architecture

- **Multi-tenant:** All entities have `tenant_id`. Authentication via JWT (after API Key login) or the `x-api-key` header.
- **White-label:** Tenants module with branding (name, color, logo), legal copy, and configurable usage limits.
- **Cross-module communication:** Internal events only (EventEmitter2). No module reaches into another module's repository or service for business rules; events are published and consumed by Audit, Notifications, and Webhooks.
- **Audit:** Append-only, generic JSONB structure, no update/delete.
- **PDF:** The original is never modified; a new final PDF is generated with an evidence page (signers, IP, User-Agent, UTC timestamp) and SHA-256 hash of the final binary.

## Technical decisions

1. **ORM:** TypeORM with per-entity repositories and centralized migrations.
2. **Event bus:** `@nestjs/event-emitter` (EventEmitter2). Typed events in `@connexto/events`.
3. **Queues:** Bull (Redis) for notifications (email) and webhooks (retry with backoff).
4. **Storage:** Interface in `@connexto/shared`, S3 implementation in `apps/api` (MinIO in dev).
5. **Guards:** Global authentication (JWT or API Key) with `@Public()` for open routes (create tenant, login, signing page).

### Why Redis + Bull instead of RabbitMQ?

The system uses Redis + Bull for async queues instead of RabbitMQ as a pragmatic choice based on:

**Reused infrastructure** — Redis is already part of the stack. Bull reuses it without adding another service to operate and monitor. RabbitMQ would add another container (~150MB), vhost configuration, exchanges, bindings, and DLQ policies.

**Operational simplicity** — `redis:7-alpine` (~30MB) starts in seconds with zero configuration. For the current scenario of two queues (email and webhooks), RabbitMQ would be over-engineering.

**Native NestJS integration** — `@nestjs/bull` is a first-class citizen in the NestJS ecosystem with decorators (`@Process`, `@OnQueueCompleted`), dependency injection, and minimal boilerplate. RabbitMQ integration requires more manual setup.

**Bull fits the problem** — The system needs: enqueue jobs, retry with exponential backoff, controlled concurrency, and persistence. Bull provides that natively. RabbitMQ is a messaging solution (pub/sub, routing, fanout, topics) — patterns the system does not use today.

**When to migrate to RabbitMQ** — Migration makes sense when multiple services consume the same events, complex routing (exchanges, topics, fanout), distributed backpressure and acknowledgement, or async inter-service communication. The "Evolution to microservices" section already covers that transition.

| Criterion              | Redis + Bull              | RabbitMQ                          |
| ---------------------- | ------------------------- | --------------------------------- |
| Operational complexity | Low (Redis already there) | Medium (new service)              |
| NestJS integration     | Native (`@nestjs/bull`)   | Manual or `@nestjs/microservices` |
| Use case               | Job queues with retry     | Distributed messaging             |
| Fit for current scope  | Strong (2 simple queues)  | Overkill for this scope           |
| Future scalability     | Limited to job queues     | Full messaging                    |

## How to run

### Prerequisites

- Node.js 24+ (recommended: 24.12.0)
- pnpm 9
- Docker and Docker Compose (for Postgres, Redis, and MinIO)

### Node version (automatic switch)

The project uses Node 24 (`.nvmrc` with `24.12.0`). To switch automatically when entering the folder:

**Option 1 – direnv (recommended)**  
With [direnv](https://direnv.net/) installed, run once at the project root:

```bash
direnv allow
```

From then on, entering the directory loads the Node version from `.envrc`.

**Option 2 – manual**  
Whenever you open a terminal in the project:

```bash
nvm use
```

**Option 3 – shell hook (bash/zsh)**  
To auto-switch in any project with `.nvmrc`, add the [nvm](https://github.com/nvm-sh/nvm#deeper-shell-integration) hook to `~/.bashrc` or `~/.zshrc` as documented by nvm.

### Local development

1. Ensure Node 24 is active (`nvm use` or direnv) and install dependencies:

   ```bash
   pnpm install
   ```

2. Start dependencies (Postgres, Redis, MinIO):

   ```bash
   cd docker && docker compose up -d postgres redis minio
   ```

3. Create `.env` at the root or in `apps/api` (or use `.env.example`):

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=connexto_signer
   REDIS_HOST=localhost
   REDIS_PORT=6379
   S3_ENDPOINT=http://localhost:9000
   S3_REGION=us-east-1
   S3_BUCKET=documents
   S3_ACCESS_KEY_ID=minioadmin
   S3_SECRET_ACCESS_KEY=minioadmin
   JWT_SECRET=your-secret
   ```

4. Run the API:
   ```bash
   pnpm dev:api
   ```

### Build and Docker

- Monorepo build:

  ```bash
  pnpm build
  ```

- API build:

  ```bash
  pnpm build:api
  ```

- Full stack with Docker Compose:
  ```bash
  cd docker && docker compose up --build
  ```

The API will be at `http://localhost:3000`.

## Main flow

1. **Create tenant:** `POST /tenants` (public) → returns tenant and API Key (show once).
2. **Authenticate:** `POST /auth/api-key/login` with `{ "apiKey": "sk_..." }` → returns JWT.
3. **Protected routes:** Header `Authorization: Bearer <jwt>` or `x-api-key: sk_...` and, when applicable, `x-tenant-id`.
4. **Document:** `POST /documents` (multipart: file + title, optional expiresAt) → document created, `document.created` event.
5. **Signers:** `POST /documents/:documentId/signers` with name and email → `signer.added` sends invite email with signing link.
6. **Signing:** Link `/sign/:token` (public) → `POST /sign/:token/accept` with consent → records IP, User-Agent, timestamp; when all sign, final PDF with evidence page and `document.completed`.
7. **Audit / Webhooks:** Event listeners write audit and dispatch tenant-configured webhooks (HMAC).

### Flow diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TENANT (Company)                             │
│                                                                     │
│  1. Signup ──► POST /tenants ──► API Key (sk_...)                  │
│  2. Login    ──► POST /auth/login ──► JWT Token                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT CREATION                                 │
│                                                                     │
│  3. Upload PDF ──► POST /envelopes/:id/documents                   │
│  4. Add signers (name, email, role)                                │
│  5. Place signature fields on the PDF                              │
│  6. Send for signing ──► POST /envelopes/:id/send                  │
│                                                                     │
│         ┌──────────────┐                                            │
│         │ EventEmitter  │                                           │
│         └──────┬───────┘                                            │
│                │                                                    │
│       ┌────────┴────────┐                                           │
│       ▼                 ▼                                           │
│  ┌─────────┐    ┌────────────┐                                     │
│  │  Audit  │    │   Redis    │                                     │
│  │ (JSONB) │    │  (Bull)    │                                     │
│  └─────────┘    └─────┬──────┘                                     │
│                       │                                             │
│              ┌────────┴────────┐                                    │
│              ▼                 ▼                                    │
│     ┌──────────────┐  ┌────────────┐                               │
│     │ Notification │  │  Webhook   │                               │
│     │  (Email)     │  │  (HMAC)    │                               │
│     └──────┬───────┘  └────────────┘                               │
│            │                                                        │
└────────────┼────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SIGNING (Signer)                                  │
│                                                                     │
│  7. Receives email with link ──► /sign/:token                      │
│                                                                     │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌─────────────┐  │
│  │ Identify  │──►│  View     │──►│  Fill     │──►│  Verify     │  │
│  │ (email/   │   │ document  │   │  fields   │   │ (OTP code)  │  │
│  │  cpf/phone│   │  (PDF)    │   │ (signature│   │             │  │
│  └───────────┘   └───────────┘   └───────────┘   └──────┬──────┘  │
│                                                          │         │
│                                                          ▼         │
│                                                   ┌─────────────┐  │
│                                                   │   Review    │  │
│                                                   │  and Sign   │  │
│                                                   └──────┬──────┘  │
│                                                          │         │
│                  POST /sign/:token/accept ◄──────────────┘         │
│                  (consent, IP, User-Agent, timestamp)               │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼ (when everyone has signed)
┌─────────────────────────────────────────────────────────────────────┐
│                       COMPLETION                                    │
│                                                                     │
│  8. Embed signatures in the PDF (pdf-lib)                          │
│  9. Generate evidence page (signers, IP, hash)                       │
│ 10. Digitally sign with ICP-Brasil certificate (PAdES)             │
│ 11. Upload final PDF to S3                                         │
│ 12. document.completed event ──► Audit + Webhook + Email           │
│                                                                     │
│  ┌────────────────────────────────────────────────────────┐        │
│  │                 Final PDF                               │        │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────────┐ │        │
│  │  │ Original │ │Signature │ │  Signing evidence      │ │        │
│  │  │ Document │ │ Fields   │ │  (hashes, certificate, │ │        │
│  │  │          │ │ Embedded │ │  IP, date, signer role) │ │        │
│  │  └──────────┘ └──────────┘ └────────────────────────┘ │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  PAdES/CAdES-BES digital signature (ICP-Brasil)                    │
│  ├── SHA-256 + RSA-PKCS1-V1_5                                      │
│  ├── signing-certificate-v2 (ESSCertIDv2)                          │
│  └── No signing-time in signed attributes                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Redis

Redis is used exclusively as the backend for async job queues via Bull.

### Queues

| Queue           | Module              | Purpose                                                                                                        |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `notifications` | NotificationsModule | Email delivery (signing invites, reminders, completed document, welcome, verification codes)                 |
| `webhooks`      | WebhooksModule      | Webhook delivery with retries and exponential backoff                                                          |

### What does NOT use Redis

| Feature       | Current implementation          |
| ------------- | ------------------------------- |
| Cache         | In-memory (`Map`)               |
| Rate limiting | In-memory (`@nestjs/throttler`) |
| Sessions      | JWT (no server-side session)    |
| Pub/Sub       | Not used                        |

### Configuration

Environment variables (`apps/api/.env`):

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

The connection is configured in `apps/api/src/app.module.ts` via `BullModule.forRoot()`. The health check (`/health`) verifies Redis connectivity with `PING/PONG` on the `notifications` queue.

### Publish and consume flow

#### `notifications` queue — Email

```
 Domain event (EventEmitter2)
        │
        ▼
 NotificationsService.sendEmail(payload)
        │
        │  queue.add('email', {
        │    to, subject, text, html, senderName
        │  })
        │
        ▼
 ┌─────────────────────────────┐
 │     Redis (Bull queue)      │
 │     queue: notifications    │
 │     job: email              │
 │     retry: 3x exponential   │
 │     delay: 1s → 2s → 4s    │
 └──────────────┬──────────────┘
                │
                ▼
 EmailProcessor (@Process('email'))
        │
        ├── SMTP configured? ──► Send via nodemailer
        └── No SMTP? ──► Log to console (dev)
```

**Scenarios that enqueue email:**

| Method                  | When it fires                         |
| ----------------------- | ------------------------------------- |
| `sendSignatureInvite`   | Document sent for signing             |
| `sendSignatureReminder` | Periodic reminder to signer           |
| `sendDocumentCompleted` | All signers have signed               |
| `sendWelcome`           | New tenant created                    |
| `sendVerificationCode`  | Signer requests OTP code              |

#### `webhooks` queue — HTTP delivery

```
 Domain event (EventEmitter2)
        │
        ▼
 WebhookEventsHandler (listener)
        │
        ▼
 WebhooksService.dispatch(tenantId, event, data)
        │
        │  For each webhook subscribed to the event:
        │  queue.add('deliver', {
        │    webhookConfigId, payload: {
        │      event, tenantId, timestamp, data
        │    }
        │  }, { attempts, backoff })
        │
        ▼
 ┌─────────────────────────────┐
 │     Redis (Bull queue)      │
 │     queue: webhooks         │
 │     job: deliver            │
 │     retry: configurable     │
 │     (default: 3x, 1s exp.) │
 └──────────────┬──────────────┘
                │
                ▼
 WebhookProcessor (@Process('deliver'))
        │
        ├── Load webhook config (URL, secret)
        ├── JSON.stringify(payload)
        ├── Sign with HMAC-SHA256 (secret)
        ├── POST to config.url
        │     Headers:
        │       Content-Type: application/json
        │       X-Webhook-Signature: sha256=<hmac>
        │       X-Webhook-Event: <event>
        │
        ├── 2xx? ──► Job completed
        └── Error? ──► throw Error ──► Bull retries
```

**Events that trigger webhooks:**

| Event                | Payload sent                         |
| -------------------- | ------------------------------------ |
| `document.created`   | `documentId`, `title`, `createdAt`   |
| `document.completed` | `documentId`, `completedAt`          |
| `document.expired`   | `documentId`, `expiredAt`            |
| `signature.signed`   | `documentId`, `signerId`, `signedAt` |

### Related packages

- `@nestjs/bull` — NestJS + Bull integration
- `bull` — Redis-backed queue implementation

## Evolution to microservices

- Each module under `apps/api/src/modules/*` is already a bounded context with its own entities, services, and events.
- To extract a context (e.g. Notifications):
  1. Move the module to a new app (e.g. `apps/notifications`) or repository.
  2. Replace EventEmitter2 with a message broker (e.g. RabbitMQ, SQS) publishing the same events.
  3. Keep event contracts (payloads) in a shared package.
  4. Expose only required APIs (e.g. health, metrics) on the new service.
- Database: today a shared schema with `tenant_id`; on extraction you can keep a shared DB with schema per service or DB per service, migrating the context tables.
- Webhooks and Audit can become async consumers of the same queued events without changing producers.

## License

Proprietary Software License — Copyright (c) 2025-2026 Rafael de Jesus. All rights reserved. See the LICENSE file for details.
