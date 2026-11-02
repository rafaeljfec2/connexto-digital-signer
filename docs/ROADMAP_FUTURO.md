# NexoSign — Product Status and Roadmap

## Document control

| Field | Value |
| --- | --- |
| Product | NexoSign / Connexto Digital Signer |
| Code revision | `37c8036` (2026-10-29) |
| Status audit | 2026-11-02 (read-only discovery) |
| Language | English (detailed evidence in Portuguese under `reports/discovery/`) |

**Disclaimer.** The 2026-11-02 audit inspected repository code and tests. Browser UX, mobile devices, and live production were **not** exercised. Claims that depend on visual or operational proof remain **UNVERIFIED**.

Prioritization of future work is a **product decision**. This document does not commit dates or delivery order.

---

## Executive summary

Vision: **Sign. Track. Manage.**

The product is a NestJS modular monolith (`apps/api`, prefix `/digital-signer/v1`) and a Next.js 14 app (`apps/web`). The delivered core is **envelope-based PDF e-signature for a single tenant per signup**:

1. Organization signup and JWT login with refresh.
2. Draft bootstrap, PDF upload, folders, and reusable templates.
3. Signers in parallel or sequential mode, with a public signing link.
4. Email OTP (default), signature capture, and a final PDF with an evidence page.
5. Download of original, final PDF, and optional `.p7s` when a tenant A1 certificate is configured.
6. Per-signer tracking, audit history, hourly reminders (Redis lock), and outbound HMAC webhooks.

**Sign** is covered in the happy path. **Track** is partial (tracking dialog exists; list/aging and in-app notifications do not). **Manage** as post-signature contract management is absent.

Maturity of the happy path is **functional** in backend code (service specs exist), not **robust**: the web app has no unit tests, some UI controls are inert, and two status paths mark envelopes `completed` without generating the final PDF.

---

## Implemented capabilities

Status labels: **DONE** (coherent API + rule, and UI when applicable), **PARTIAL** (incomplete rule or wiring). Visual UX remains UNVERIFIED unless noted.

### Account and tenancy

| Capability | Status | Pointers |
| --- | --- | --- |
| Signup (tenant + owner) | DONE | `POST /tenants`, `apps/web` signup form |
| Login, refresh, logout | DONE | `apps/api/src/modules/auth/` |
| Multi-tenant query isolation | DONE | `@TenantId()` from JWT / API key; service `where: { tenantId }` |
| Password reset / change | MISSING | No routes |
| Members, invites, RBAC | MISSING | `UserRole` stored, not enforced by guards |

### Document preparation

| Capability | Status | Pointers |
| --- | --- | --- |
| Draft + upload + storage | DONE | `POST /envelopes/draft`, `POST /documents/:id/file`, S3/MinIO |
| Folders (root `Documentos`) | DONE | `apps/api/src/modules/folders/` |
| Signature / initials fields | DONE | Editor + `signature-fields.service.ts` |
| Name / date / text fields | PARTIAL | API + signer fill; manual palette not wired (`FieldPalette.tsx` unused) |
| Templates + variables | DONE | `apps/api/src/modules/templates/`, web templates UI |
| AI field suggestion | PARTIAL | `POST /documents/:id/ai/suggest-fields` (needs `AI_API_KEY`); no AI specs |
| File validation | PARTIAL | PDF/PNG/JPEG/WEBP; finalization assumes PDF |

### Signature requests

| Capability | Status | Pointers |
| --- | --- | --- |
| Send envelope | DONE | `POST /envelopes/:id/send` → [`envelope-dispatch.service.ts`](../apps/api/src/modules/signatures/services/envelope-dispatch.service.ts) |
| Parallel / sequential notify | DONE | Sequential notifies first; next on accept |
| Invite email (MailerSend + Bull) | DONE | `notifications` queue; logger driver when no API key outside production |
| Signer OTP | PARTIAL | Email OTP; `authMethod=none` skips verification |
| Identity collection (CPF/phone) | PARTIAL | Format validation only; no bureau |
| Cancel / resend / decline after send | MISSING | `DELETE /envelopes/:id` drafts only |
| Expiration | BROKEN when partial signatures exist | See [Known issues](#known-issues-code-verified) |

### Signer experience

| Capability | Status | Pointers |
| --- | --- | --- |
| Public flow `/sign/:token` | DONE in code / UNVERIFIED visually | [`apps/web/src/app/[locale]/sign/[token]/page.tsx`](../apps/web/src/app/[locale]/sign/[token]/page.tsx) |
| Responsive / mobile CSS | PARTIAL / UNVERIFIED | Tailwind breakpoints; no device run |
| Attachments | MISSING | — |
| Distinct expired vs invalid token UI | PARTIAL | i18n keys exist; page uses generic error |

### Tracking and completed documents

| Capability | Status | Pointers |
| --- | --- | --- |
| KPIs + envelope list | PARTIAL | `GET /envelopes/stats`; dashboard `?status=` not applied by list |
| Per-signer tracking | DONE | `GET /envelopes/:id/tracking` |
| Audit / historico | PARTIAL | Audit APIs + web; activity feed uses `createdAt` |
| Final PDF + evidence + hashes | DONE on last accept | `pdf.service.ts`, finalize path in dispatch |
| A1 certificate → PAdES / `.p7s` | DONE | Settings certificate + `certificate.service.ts` |
| In-app notification bell | MISSING | Hardcoded empty list in `app-shell.tsx` |
| Contract repo (tags, renewal, content search) | MISSING | `expiresAt` is signing deadline only |

### Integrations and commercial

| Capability | Status | Pointers |
| --- | --- | --- |
| Outbound webhooks + HMAC + retry | DONE | `apps/api/src/modules/webhooks/` |
| Developer API keys + request logs | PARTIAL | Keys managed; scopes not enforced; core envelope routes require JWT |
| OpenAPI / Scalar | PARTIAL | Only when `API_DOCS_ENABLED=true` |
| Usage counter | PARTIAL | `GET /billing/usage`; no UI; `usageLimits` not enforced |
| Plans / invoices / Stripe | MISSING | Marketing pricing is static copy |

---

## Known issues (code-verified)

1. **Sequential reminders invite the wrong people.** `ReminderSchedulerService` loads every `pending` signer. Null `notifiedAt` is treated as timestamp `0`, so the interval has “elapsed” and a claim sets `notifiedAt` before that signer’s turn. Sequential send only notifies the first signer.  
   Evidence: [`reminder-scheduler.service.ts`](../apps/api/src/modules/notifications/services/reminder-scheduler.service.ts), [`envelope-dispatch.service.ts`](../apps/api/src/modules/signatures/services/envelope-dispatch.service.ts).

2. **Expiry with at least one signature marks `completed` without a final PDF.** `processExpiredEnvelope` sets envelope/document status and does not call `finalizeEnvelope` or emit `document.expired`. `DocumentsService.markExpired` emits the event but is not used by the cron.  
   Evidence: same scheduler file; [`documents.service.ts`](../apps/api/src/modules/documents/services/documents.service.ts).

3. **Manual close does not produce a PDF.** `closureMode` is stored. `closeDocument` marks `completed`, emits `document.completed`, and has **no controller**.  
   Evidence: [`documents.service.ts`](../apps/api/src/modules/documents/services/documents.service.ts) `closeDocument`.

4. **Reminder claim is not rolled back if email send fails** after a successful `UPDATE` on `reminderCount`. That reminder slot is lost.  
   Evidence: `sendReminderIfDue` in the scheduler (catch after claim).

Related UI gaps (code): empty “Save draft” handler in review step; help buttons without navigation; contact form `preventDefault` only; silent 404 when signed PDF is missing on success/summary pages.

---

## Explicit gaps (MISSING)

Summarized from the product inventory. Full tables: [`reports/discovery/02-product-inventory.md`](../reports/discovery/02-product-inventory.md).

- Password recovery and user profile editing.
- Organization members, invites, and role-based access.
- Decline, void/cancel after send, manual invite resend.
- Signer attachments; document version history; share link for completed files beyond the signing token.
- Delivery status for invite email (queued vs accepted vs bounced).
- Aging / “who is delaying” on the list (beyond tracking dialog).
- Enforced plan limits and SaaS billing.
- API-key-driven create/upload/send for the same path the JWT UI uses (`hasScope` unused).
- Post-signature contract management (categories, tags, obligations, renewal).

---

## Delivery record (original product phases)

Historical phases from the previous version of this file, mapped to current code.

### Phase 1 — Auth foundation

- [x] Signup / login / dashboard shell / i18n / audit of login events  
  Spec: [`SPEC_MVP_FASE1.md`](SPEC_MVP_FASE1.md)

### Phase 2 — Dashboard + upload

- [x] KPI cards (pending, completed, expired, draft) — partial: status query from KPI links not applied by list
- [x] Primary CTA “New document” → draft then wizard
- [x] Paginated envelope list with status filter (list control, not `?status=` from URL)
- [x] Upload with validation and storage — partial: images allowed though PDF is the signing path
- [x] Route `/documents/new` and envelope editor `/documents/:id`

Note: stats live under `GET /envelopes/stats` (envelope model), not the original `GET /documents/stats` sketch.

### Phase 3 — Signers + review + send

- [x] Signer CRUD on envelope; optional order; parallel / sequential
- [x] Signature field placement (signature / initials in UI)
- [~] Name / date fields in sidebar — API yes; manual palette not wired
- [x] Review checklist + send + invite notification
- [ ] Required-field hard block before send — checklist warns only

### Phase 4 — Status + signer experience

- [x] Public `/sign/:token` flow (identify → view → fill → OTP → accept)
- [x] Viewed / notified / verified / signed tracking
- [x] Evidence page on final PDF; download original / signed / `.p7s`
- [ ] Resend invite / copy link / void after send as first-class actions
- [~] Timeline “Created → Viewed → Signed → Completed” — summary/tracking cover much of this; “viewed” not on envelope summary timeline

### Engineering already beyond the old sketch

- [x] Folders, templates, tenant signers contacts
- [x] Hourly reminders + expiry cron with Redis locks ([`API_HORIZONTAL_SCALING.md`](API_HORIZONTAL_SCALING.md))
- [x] Webhooks, developer keys, API request logs
- [x] Tenant settings (branding, certificate, defaults, notifications)
- [x] MailerSend (not SMTP/nodemailer) via Bull
- [x] Migrations with `synchronize: false`; boot migrations fail-soft after listen

---

## Future work (unordered, no commitment)

Derived from [`reports/discovery/07-opportunity-backlog.md`](../reports/discovery/07-opportunity-backlog.md). **Not** a prioritized backlog.

### Reliability

- Fix expiry and manual-close so `completed` always means a final PDF (or a distinct status).
- Fix sequential reminders; roll back claim on send failure; emit `document.expired` on the real cron path.
- Surface missing signed-file errors in the UI; invite delivery visibility.

### Autonomy

- Password reset; post-send correct / cancel / decline / resend.
- Distinct expired-token messaging; working help/contact; apply dashboard status query params.
- Pending signers visible without opening the tracking dialog.

### Preparation and signing

- Wire name/date/text palette or drop the expectation; clarify send-without-fields policy.
- Fix or remove inert “Save draft”; PDF-only upload vs image support; verify mobile signing; persist signer wizard step across reload.

### Integration

- JWT-equivalent API key path for envelopes/documents/send; enforce scopes; one API key model.
- Align webhook event catalog with emitters; webhook event idempotency; decide production OpenAPI flag.

### Manage / commercial (many remain hypotheses)

- Stronger search; contract term dates / renewal / obligations; attachments; plans with visible usage — only if product chooses to build them.

---

## Long-term evolution

| Theme | Already present | Still open |
| --- | --- | --- |
| Observability | Pino structured logs; health readiness/liveness; API request logs | Prometheus, OpenTelemetry, request correlation as a product standard |
| Security | Composite auth, throttling, audit logs, HMAC webhooks, optional A1 PAdES/CAdES | Helmet, broader sanitization, enforced RBAC, dependency scanning process |
| Performance | Pagination, upload size limits, Bull workers | Shared AI cache across pods, Redis tenant config cache |
| Multi-environment | FlowDeploy production API | Explicit staging, feature flags, canary |
| Signature trust | Tenant A1 certificate, evidence page, hashes | Broader ICP-Brasil / TSA product packaging |
| Product depth | Templates, folders, AI suggest fields | SSO, bulk signing, versioned public API as a contract, post-signature CLM |

Engineering sequencing details: [`EVOLUTION_GUIDE.md`](EVOLUTION_GUIDE.md).

---

## Further reading

Detailed discovery reports (Brazilian Portuguese). Use them for evidence, not as operating rules.

| Report | Purpose |
| --- | --- |
| [`reports/discovery/01-executive-summary.md`](../reports/discovery/01-executive-summary.md) | Executive summary |
| [`reports/discovery/02-product-inventory.md`](../reports/discovery/02-product-inventory.md) | Full capability inventory |
| [`reports/discovery/03-ux-audit.md`](../reports/discovery/03-ux-audit.md) | UX flow analysis (code-only) |
| [`reports/discovery/04-market-pain-research.md`](../reports/discovery/04-market-pain-research.md) | Competitor pain with source URLs |
| [`reports/discovery/05-gap-analysis.md`](../reports/discovery/05-gap-analysis.md) | Market vs NexoSign matrix |
| [`reports/discovery/06-technical-assessment.md`](../reports/discovery/06-technical-assessment.md) | Security and reliability risks |
| [`reports/discovery/07-opportunity-backlog.md`](../reports/discovery/07-opportunity-backlog.md) | Unordered opportunities |

Related docs in this folder: [`README.md`](README.md) (index), [`SPEC_MVP_FASE1.md`](SPEC_MVP_FASE1.md) (historical Phase 1), [`API_HORIZONTAL_SCALING.md`](API_HORIZONTAL_SCALING.md), [`AI_AGENTS_STRATEGY.md`](AI_AGENTS_STRATEGY.md) (AI product strategy, not runtime status).
