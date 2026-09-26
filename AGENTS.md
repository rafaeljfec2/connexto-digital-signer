# AGENTS.md

Briefing for coding agents working in this repository. Read this before source code.

Product AI feature ideas live in `docs/AI_AGENTS_STRATEGY.md`. That file is product strategy, not operating rules for this repo.

## What this is

NexoSign / Connexto Digital Signer: multi-tenant electronic signature SaaS.

- API: NestJS modular monolith (`apps/api`), prefix `/digital-signer/v1`
- Web: Next.js 14 + next-intl (`apps/web`), default port `3001`
- Packages: `@connexto/shared`, `@connexto/events`, `@connexto/database`, `@connexto/ai`
- Production API: `https://api-signer.connexto.com.br` (FlowDeploy, workdir `apps/api`)

## Stack

| Layer | Choice |
|---|---|
| Package manager | pnpm 9 workspaces + Turborepo |
| Node | >= 24 |
| API | NestJS 10, TypeORM 0.3, PostgreSQL, Redis/Bull, S3/MinIO |
| Web | Next.js 14.2, React 18, TanStack Query, RHF + Zod, next-intl |
| Auth | JWT + tenant API keys; public routes for signup, login, `/sign/:token` |
| i18n | `pt-br` (default), `en` — UI copy in message files, code identifiers in English |

## Layout

```
apps/api/          NestJS API + TypeORM migrations + FlowDeploy Dockerfile
apps/web/          Next.js app
packages/          shared contracts, events, AI, database
docs/              product/architecture notes (not always SDD-complete)
```

There is no `memory/` or `specs/` yet. Do not invent SDD folders unless asked.

## Commands

```bash
pnpm install
pnpm dev                 # turbo: api + web
pnpm --filter api dev
pnpm --filter web dev    # http://localhost:3001
pnpm --filter api test -- <path> --no-coverage
pnpm --filter api lint
pnpm --filter web lint
pnpm build
```

API migrations: `pnpm --filter api migration:run` (from `apps/api` data-source).

## Non-negotiables

- Respond to the user in Brazilian Portuguese. Code, comments, commits, identifiers, and this file stay in English.
- Specs/docs are the source of truth when they exist. Do not change business rules unless asked.
- Never commit `.env`, credentials, or secrets. Never edit `.env` without explicit permission.
- Never `git push` or deploy unless the user asks (or an approved plan includes it).
- Never use `any`. Prefer `??` over `||` for fallbacks. Props/DTOs are `Readonly` when they are objects.
- Keep functions small (aim <= 40 lines). Split files before they pass ~400–500 lines.
- Business logic stays out of Nest controllers. Validate all external input.
- Modules talk through events (`@connexto/events`), not by reaching into another module’s repository.
- Reuse existing abstractions. Do not add dependencies without checking workspace alternatives.
- Tests for relevant changes: isolated, deterministic, descriptions in English.
- Do not edit `.md` files unless the user authorized it.

## API rules

- Tenant scope every query (`tenantId` from JWT / API key). Never trust a client-supplied tenant id for authorization.
- First-document bootstrap: `POST /envelopes/draft` creates root folder `Documentos` (if missing), draft envelope, and empty document.
- `GET /folders` also ensures that root folder.
- `EVENT_TENANT_CREATED` seeds the root folder on signup.
- Boot migrations must not kill the process; log and keep listening so FlowDeploy healthchecks pass.
- Health: `GET /digital-signer/v1/health` (also `/live`).
- Production schema is migration-driven. Local `synchronize` is not a substitute for a missing CREATE TABLE.

## Web rules

- Use `@/i18n/navigation` (`Link`, `useRouter`, `usePathname`), not raw `next/link` / `next/navigation`, for in-app routes.
- `NEXT_PUBLIC_API_URL` is bake-time. Local web may point at production; treat API failures as production data/schema issues first.
- Signup password: 8+ chars with upper, lower, and digit. Show the real Zod error, not “required” for every failure. Forms that use Zod need `noValidate`.
- `documents/new` calls `POST /envelopes/draft` then routes to `/documents/:envelopeId`. Do not silently `replace` back to the list on error.

## Production (FlowDeploy)

- App: `connexto-digital-signer-api`, workdir `apps/api`, host `api-signer.connexto.com.br`
- Shared infra on `paasdeploy`: Postgres (admin role `axiom`), Redis (`redis://default:<pass>@redis:6379`), MinIO
- `paasdeploy.json`: container port 3000, hostPort 3004, health `/digital-signer/v1/health`
- Do not enable `CREATE EXTENSION vector` unless explicitly requested.
- MinIO bucket and `S3_*` keys are required for PDF upload; SMTP/`AI_API_KEY` are optional until those features are used.

## Discovery order

1. This file
2. `README.md`, then `docs/` only if the task needs it
3. `apps/*/package.json` and the module you will change
4. Source last

Stop as soon as the question is answered.

## Done means

Lint/tests for touched packages, no leftover debug, and a PT-BR summary of impact, tradeoffs, and how to verify.
