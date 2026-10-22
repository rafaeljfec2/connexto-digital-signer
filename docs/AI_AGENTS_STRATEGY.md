# Strategic Study: AI Agents in Connexto Digital Signer

## Product Context

Connexto Digital Signer is a multi-tenant electronic signature SaaS platform with:

- Document creation wizard (Upload, Signers, Fields, Settings, Review)
- Public signing flow in 4 steps (View, Fill, Verify, Review)
- Full audit trail, webhooks, automatic reminders, multi-language
- Compliance with MP 2.200-2/2001 and Law 14.063/2020

---

## 1. Smart Field Placement Agent

**Pain it solves:** Today users must manually drag and place each signature field on the PDF. On long documents with multiple signers, this is tedious and error-prone.

**How it works:**

- User uploads the PDF
- The agent analyzes document content using OCR + LLM
- Automatically detects signature areas (lines "___________", text like "Signature:", "Witness:", signature blocks)
- Suggests field placement (signature, name, date, initials) with normalized coordinates
- User reviews and adjusts suggestions with one click

**Product impact:**

- Cuts document prep time from minutes to seconds
- Direct competitive differentiator vs DocuSign/Clicksign
- Better new-user onboarding (shorter learning curve)

**Technical integration:**

- New endpoint `POST /documents/:id/ai/suggest-fields`
- Uses PDF already stored in S3 (`originalFileKey`)
- Returns array of suggested `SignatureField` with coordinates
- Frontend shows suggestions as "ghost" fields the user confirms

**Complexity:** Medium | **Impact:** High | **Priority:** 1

---

## 2. Document Summary Agent

**Pain it solves:** Signers receive long, complex PDFs. Many do not read the full document before signing, or take longer because they must read everything.

**How it works:**

- When the signer opens the signing link (`/sign/:token`)
- The agent generates a structured document summary:
  - Document type (NDA, service agreement, SOW, etc.)
  - Parties involved
  - Main obligations
  - Relevant deadlines and amounts
  - Termination/penalty clauses
- Shown as a collapsible card on the View step, before the signer fills fields

**Product impact:**

- Higher signing completion rate (less abandonment)
- Lower average time to sign
- Unique UX differentiator in the Brazilian market
- Builds trust (signer understands what they are signing)

**Technical integration:**

- New endpoint `GET /sign/:token/ai/summary`
- Cache summary in the database (`aiSummary` JSONB on `documents`)
- Generated on first view, then cached
- Frontend: new component in `view-step.tsx`

**Complexity:** Low | **Impact:** High | **Priority:** 1

---

## 3. Intelligent Reminder Agent

**Pain it solves:** The current system sends reminders on fixed intervals (1, 2, 3, or 7 days). It does not consider signer behavior, optimal send time, or message tone.

**How it works:**

- Analyzes historical signing patterns per tenant:
  - Times with highest open/sign rates
  - Ideal number of reminders before signing
  - Signers who never open vs. open but do not sign
- Personalizes reminder tone:
  - 1st reminder: neutral and informative
  - 2nd reminder: light urgency + mentions deadline
  3rd reminder: high urgency + consequences
- Optimizes send time per signer

**Product impact:**

- 15–30% completion rate lift (market benchmark)
- Fewer expired documents
- Less friction with signers (no emails at inconvenient times)

**Technical integration:**

- Evolution of existing `ReminderSchedulerService`
- New `signer_engagement` table for open tracking
- Email tracking pixel or open webhook
- LLM generates personalized reminder copy from context

**Complexity:** Medium | **Impact:** High | **Priority:** 2

---

## 4. Document Classification & Template Agent

**Pain it solves:** Users send the same document types repeatedly (NDAs, contracts, addenda). Each time they configure everything from scratch.

**How it works:**

- On upload, the agent automatically classifies document type
- Suggests a configuration template (signers, fields, settings) from similar past documents
- Learns from tenant documents for increasingly accurate templates
- Allows saving configurations as reusable templates

**Product impact:**

- Drastically reduces prep time for recurring documents
- "Smart templates" is highly sellable to legal teams
- Increases retention (more templates → harder to migrate)

**Technical integration:**

- New `DocumentTemplate` entity with predefined fields, signers, and settings
- Endpoint `POST /documents/:id/ai/classify`
- Endpoint `GET /tenants/:id/templates/suggestions`
- Document embeddings for similarity search

**Complexity:** Medium | **Impact:** High | **Priority:** 2

---

## 5. Compliance Checker Agent

**Pain it solves:** Companies must ensure documents meet legal requirements before sending for signature.

**How it works:**

- Analyzes the document against a compliance checklist:
  - Complete party identification (CPF/CNPJ, addresses)
  - Mandatory clauses (jurisdiction, applicable law, termination)
  - Ambiguous or problematic language
  - Amounts without written form
  - Inconsistent dates
- Returns compliance score + alert list

**Product impact:**

- Positions the product beyond signing: "compliance-first"
- Reduces clients' legal risk
- Premium plan upsell
- Strong differentiator in Brazil (complex regulation)

**Technical integration:**

- Endpoint `POST /documents/:id/ai/compliance-check`
- Result shown in wizard before send (Review step)
- Alerts as non-blocking warnings with fix suggestions

**Complexity:** Medium–High | **Impact:** High | **Priority:** 3

---

## 6. Signing Assistant Chatbot

**Pain it solves:** Signers, especially less technical ones, abandon the flow because they do not understand the process or have questions about the document.

**How it works:**

- Floating chat widget on the signing page (`/sign/:token`)
- Answers questions about:
  - The signing process ("Is it secure?", "Is it legally valid?")
  - The document ("What does clause 5 say?", "What is the deadline?")
  - Technical issues ("I cannot draw my signature")
- Context: document content + product FAQ

**Product impact:**

- Less abandonment in the signing flow
- Fewer support tickets
- Premium experience that builds trust

**Technical integration:**

- React component `<SigningAssistant />` on `/sign/:token` layout
- Endpoint `POST /sign/:token/ai/chat` (stateless, context per request)
- Context: PDF content + FAQ embeddings

**Complexity:** Medium | **Impact:** Medium | **Priority:** 3

---

## 7. Fraud Detection Agent

**Pain it solves:** Fraudulent signatures or suspicious behavior can compromise documents' legal validity.

**How it works:**

- Analyzes behavior patterns during signing:
  - Very short time between open and sign (did not read)
  - IP from unexpected country
  - Multiple signatures from same IP in a short window
  - Inconsistent User-Agent
  - Signature image very different from prior signatures for same email
- Produces risk score per signature
- Alerts document owner in suspicious cases

**Product impact:**

- Unique security layer
- Strengthens legal validity of signatures
- Differentiator for enterprise and financial clients

**Technical integration:**

- New `riskScore` field on `Signer`
- Async processing via Bull queue after `signature.completed`
- Risk dashboard for document owner
- Webhook event `signature.risk_detected`

**Complexity:** High | **Impact:** High | **Priority:** 4

---

## 8. Natural Language Document Generation

**Pain it solves:** Many companies lack a contract template and waste time creating documents from scratch.

**How it works:**

- User describes in natural language what they need: "I need an NDA between my company and a vendor, 2-year term, R$ 50,000 penalty"
- The agent generates a professional PDF with relevant clauses
- User reviews, edits if needed, and sends for signing in the same flow

**Product impact:**

- Evolves from "signing tool" to "contract platform"
- Significantly increases TAM
- "Wow" feature with viral potential

**Technical integration:**

- New wizard path: "Create document with AI" vs "Upload PDF"
- Endpoint `POST /documents/ai/generate`
- Legal templates as base + LLM customization
- Generate PDF with pdf-lib

**Complexity:** High | **Impact:** Very High | **Priority:** 4

---

## 9. Analytics & Insights Agent

**Pain it solves:** Account owners lack visibility into signing process efficiency.

**How it works:**

- Dashboard with AI-generated insights:
  - "Your documents take on average 3.2 days to be signed. 40% slower than platform average"
  - "João Silva has 5 pending documents for more than 7 days"
  - "Your NDAs have 85% completion rate, but service contracts only 60%"
  - "Suggestion: enabling reminders every 2 days may cut average time by 30%"
- Periodic email reports

**Technical integration:**

- Aggregated queries on `documents`, `signers`, `audit_logs`
- Endpoint `GET /tenants/:id/ai/insights`
- Dashboard component with insight cards
- Weekly email summary

**Complexity:** Medium | **Impact:** Medium | **Priority:** 5

---

## Priority Map

### Priority 1 — High-Impact Quick Wins
- **Smart Field Placement** — AI automatic field placement
- **Document Summary** — Smart document summary for signers

### Priority 2 — Competitive Differentiation
- **Intelligent Reminders** — Personalized reminders with optimized timing
- **Classification & Templates** — Auto classification and smart templates

### Priority 3 — Added Value
- **Compliance Checker** — Legal compliance verification
- **Signing Chatbot** — Chat assistant for signers

### Priority 4 — Future Vision
- **Fraud Detection** — Anomaly detection and risk scoring
- **Document Generation** — Contract generation via natural language
- **Analytics & Insights** — Data intelligence and reports

### Feature dependencies

```
Smart Field Placement ──> Intelligent Reminders ──> Fraud Detection
Document Summary ──────> Signing Chatbot ─────────> Analytics & Insights
                         Classification & Templates ──> Document Generation
                         Compliance Checker ──────────> Fraud Detection
```

---

## Suggested Technical Architecture

To implement AI agents in a scalable, decoupled way:

```
┌──────────────────┐    ┌──────────────────────────────────────────┐
│  Frontend        │    │  NestJS API                              │
│  Next.js         │───>│  AI Controller ──> AI Service ──> Queue  │
│  UI Components   │    │                                          │
└──────────────────┘    └──────────────┬───────────────────────────┘
                                       │
                        ┌──────────────▼───────────────────────────┐
                        │  AI Layer                                │
                        │  AI Gateway Service ──> OpenAI API       │
                        │  Redis Cache                             │
                        │  Vector Store (pgvector)                 │
                        └──────────────┬───────────────────────────┘
                                       │
                        ┌──────────────▼───────────────────────────┐
                        │  Storage                                 │
                        │  S3 (PDFs) + PostgreSQL                  │
                        └──────────────────────────────────────────┘
```

**Key architectural decisions:**

- **AI Gateway Service:** Abstraction over the LLM provider (OpenAI, Anthropic, etc.) so you can swap without code impact
- **Bull Queue:** AI tasks are async by nature. Queues avoid timeouts and enable retry
- **Redis Cache:** Summaries and classifications cached to avoid unnecessary API cost
- **pgvector:** For document/template similarity search, use PostgreSQL pgvector (already used in the project)
- **Cost per tenant:** Track tokens consumed per tenant for AI feature billing

---

## Suggested Monetization

- **Free plan:**
  - Smart Field Placement: 3 docs/month

- **Pro plan:**
  - Smart Field Placement: unlimited
  - Document Summary: unlimited
  - Intelligent Reminders: unlimited
  - Document Generation: 5 docs/month

- **Enterprise plan:**
  - All features unlimited
  - Compliance Checker
  - Signing Chatbot
  - Fraud Detection
  - Unlimited Document Generation

---

## Recommended Next Steps

1. **Validate with users:** Before building, talk to 5–10 active users about most urgent pains
2. **Smart Field Placement PoC:** Most visible, sellable quick win. Implement with OpenAI Vision API + pdf-lib
3. **Document Summary PoC:** Second quick win. Simple (extract PDF text + send to LLM)
4. **AI Gateway infrastructure:** Build the abstraction layer early to avoid technical debt
5. **Metrics:** Define KPIs per AI feature (time saved, conversion rate, NPS)
