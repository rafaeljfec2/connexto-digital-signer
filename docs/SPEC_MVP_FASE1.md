## Technical Specification — MVP Phase 1

Status: COMPLETED

### Objective

Deliver the MVP foundation with email/password authentication, login event auditing, guard refactor by consumption type, and frontend foundation with login and dashboard shell. The main goal is to reduce friction on first access and prepare for later phases.

### In Scope

- User entity and users module on the backend.
- Email/password login with JWT.
- Authentication event auditing.
- Guard refactor to separate JWT and API Key access.
- Next.js frontend with login, signup, and dashboard shell.
- i18n (en/pt-br), auto slug, and signup password policy.

### Out of Scope

- Dashboard with KPIs and document upload.
- Signing flow and signature fields.
- Email notifications, webhooks, and end-to-end storage.
- Observability and advanced hardening.

---

## Authentication Architecture

### User Entity

File: `apps/api/src/modules/users/entities/user.entity.ts`

Main fields:

- `id` (uuid)
- `tenantId` (logical relation to tenant)
- `email` (unique)
- `passwordHash`
- `name`
- `role` (owner | admin | member)
- `isActive`
- `createdAt`, `updatedAt`

### Email and Password Flow

Endpoint: `POST /digital-signer/v1/auth/login`

Input:

- `email`
- `password`

Output:

- `accessToken`
- `expiresIn`
- `user` (id, name, email, role, tenantId)

### API Key Flow

Current endpoint:

- `POST /digital-signer/v1/auth/api-key/login`

Kept for compatibility. Must keep returning JWT with `authMethod = 'api_key'`.

### JWT Payload

File: `packages/shared/src/decorators/current-user.decorator.ts`

Structure:

- `sub` (userId for email login, tenantId for API Key)
- `email`
- `tenantId`
- `role`
- `authMethod` (`jwt` | `api_key`)

---

## Guard Refactor

### Principle

Separate access by consumption type:

- Dashboard routes: JWT + TenantGuard
- External API routes: API Key + TenantGuard

### Guards

New files:

- `apps/api/src/common/guards/composite-auth.guard.ts`

Optional (recommended for MVP):

- `apps/api/src/common/guards/composite-auth.guard.ts`

Expected behavior:

- `CompositeAuthGuard`: tries JWT first, then API Key, and records `authMethod`

Restriction decorator:

- `@RequireAuthMethod('jwt' | 'api_key')`

### Controller Mapping

- `AuthController`: `@Public()`
- `SignController`: `@Public()`
- `HealthController`: `@Public()`
- `AuditController`: `JwtAuthGuard`
- `BillingController`: `JwtAuthGuard`
- `WebhooksController`: `ApiKeyAuthGuard`
- `DocumentsController`: `CompositeAuthGuard`
- `SignaturesController`: `CompositeAuthGuard`
- `TenantsController`:
  - `create`: `@Public()`
  - others: `CompositeAuthGuard`

---

## Authentication Audit

### Minimum Events

Events in `packages/events/src/event-names.ts`:

- `USER_LOGIN_SUCCESS`
- `USER_LOGIN_FAILED`
- `USER_LOGOUT`

Types in `packages/events/src/event-types.ts`:

- `UserLoginSuccessEvent`
- `UserLoginFailedEvent`
- `UserLogoutEvent`

### Handler

File: `apps/api/src/modules/audit/events/audit.events-handler.ts`

Rules:

- `USER_LOGIN_SUCCESS`: log with `tenantId`, `userId`, `ipAddress`, `userAgent`
- `USER_LOGIN_FAILED`: log with `email`, `ipAddress`, `userAgent`, `reason`, and `tenantId = 'system'`
- `USER_LOGOUT`: log with `tenantId`, `userId`, and `email`

### Rationale

Authentication auditing provides legal traceability and supports internal and external audits.

---

## API Endpoints (New and Changed)

| Method | Route                                    | Description              |
|--------|------------------------------------------|--------------------------|
| POST   | `/digital-signer/v1/auth/login`          | Email/password login     |
| POST   | `/digital-signer/v1/auth/logout`         | User logout (JWT)        |
| POST   | `/digital-signer/v1/auth/api-key/login`  | API Key login (kept)     |

---

## Frontend — Stack and Structure

### Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- @tanstack/react-query
- react-hook-form + zod
- axios
- sonner

### Folder Structure

```
apps/web/src/
  app/
    [locale]/
      (auth)/
        login/
          page.tsx
        signup/
          page.tsx
        layout.tsx
      (dashboard)/
        page.tsx
        layout.tsx
      layout.tsx
    layout.tsx
  features/
    auth/
      components/
      hooks/
      api.ts
  shared/
    ui/
    api/
    hooks/
    styles/
```

### Design Tokens

Tokens via CSS variables and Tailwind for white-label, with login gradient and tenant primary colors.

---

## Phase 1 Screens

### Login

Requirements:

- Blue → teal gradient background
- Center card with shadow
- Connexto logo
- Simple form: email + password
- Primary CTA: "Sign in"
- Mobile-first

### Dashboard Shell

Requirements:

- Header with logo, tenant name, and avatar
- Sidebar placeholder (minimal)
- Welcome message

---

## Non-Functional Requirements

- Mobile-first on all screens
- White-label per tenant via CSS variables
- Feature-based structure
- No Redux in the MVP
- Unit tests for auth and audit

---

## Migration and Seed

- Migration for `users` table
- On tenant creation, create OWNER user with password set at signup
- Migrations run automatically on startup
