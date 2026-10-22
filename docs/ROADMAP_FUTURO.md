## Future Implementation Roadmap

### Current Status

- Phase 1 completed (Auth, Users, Audit, i18n, Signup/Login, Dashboard shell)

### Product Overview

End goal: take the user from PDF upload to completed signing with minimal cognitive friction and full traceability.

Target flow:

1. Login
2. Dashboard
3. Document upload
4. Define signers
5. Define signature fields
6. Review and send
7. Document status
8. Signer experience

---

## Phase 2 — Dashboard + Upload

### Dashboard

Requirements:

- KPI cards: pending, completed, expired
- Primary CTA: "New Document"
- No option or information overload

Backend:

- Per-tenant counter endpoint (`GET /documents/stats`)
- Paginated document list (`GET /documents?page=&limit=&status=`)
- Filter by status

Frontend:

- KPI cards + skeleton loaders
- Clear empty state
- Recent documents table

### Document Upload

Requirements:

- Drag and drop
- PDF only
- Immediate visual feedback
- File name + size
- "Continue" CTA

Backend:

- File type validation (PDF)
- Size limits (env)
- File hash and storage
- Response with created document

Frontend:

- Dedicated route `/documents/new`
- Dropzone with type and size validation
- Title field + submit

---

## Phase 3 — Signers + Review + Send

### Define Signers

Layout:

- Two columns
- Left: signer list, email, optional order
- Right: static PDF preview
- CTA: "Define Signature Fields"

Backend:

- Signer CRUD per document
- Optional signing order rules

### Signature Fields

Layout:

- PDF in the center
- Right sidebar: signature, date, name
- Simple drag and drop
- Highlight active signer

Backend:

- Persist fields on the document
- Required field validation

### Review and Send

Visual checklist:

- Document
- Signers
- Fields
- Deadline

Strong CTA: "Send for Signing"

Backend:

- Trigger notifications
- Document status transition

---

## Phase 4 — Status + Signer Experience

### Document Status

Requirements:

- Timeline: Created → Viewed → Signed → Completed
- Actions: resend invite, copy link, download evidence

Backend:

- View event recording
- Evidence generation

### Signer Experience

Requirements:

- Ultra-simple UX
- Document preview
- Single CTA: "Sign Document"
- Confirmation modal
- Success message

Backend:

- Public endpoint to fetch signer data
- Public endpoint to accept signature
- Dedicated rate limiting

---

## Long-Term Evolution

### Observability

- Structured logs (Pino JSON)
- Correlation ID per request
- Prometheus metrics
- OpenTelemetry tracing

### Security Hardening

- Helmet
- Input sanitization
- API Key rotation
- Sensitive operation audit
- Dependency scanning

### Performance

- Redis cache per tenant
- Pagination on listings
- Upload limit per profile
- Storage optimization

### Multi-Environment

- Staging
- Feature flags
- Blue/green or canary
- Backup and restore

### Qualified Digital Signature

- ICP-Brasil (A1/A3)
- Timestamp
- Advanced legal proof

### Integrations and Product

- SSO (SAML / OIDC)
- Document templates
- Bulk signing
- Versioned public API
