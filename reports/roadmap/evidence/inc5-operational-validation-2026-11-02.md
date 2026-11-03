# Incremento 5 — Evidências operacionais e runbook

**Data/hora:** 2026-11-02 (America/Sao_Paulo)  
**Repositório:** `rafaeljfec2/connexto-digital-signer`  
**Branch:** `feature/inc5-observability-operational-validation`  
**Base `develop`:** `bdf787c1fe636784b4f5d61cd15dbe0807a2d4fc` (`chore: bump version numbers for api and web packages`)

## Runbook E1–E6 (referência operacional)

| ID | Cenário | Método de verificação nesta sessão | Resultado |
|---|---|---|---|
| E1 | Fluxo feliz: conclusão com PDF final | Regressão automatizada (`envelope-dispatch`, signing-flow specs na suíte API completa) | **PASS** (suíte API) |
| E2 | Modo sequencial + lembretes só no signatário ativo | `reminder-scheduler.service.spec.ts` (Increment 2 / C1) | **PASS** |
| E3 | Expiração com assinaturas parciais → `expired` (A1) | `reminder-scheduler.service.spec.ts` (I0-AC1 / Increment 1) | **PASS** |
| E4 | Cancelamento void com assinaturas parciais | Specs Inc 4 na suíte API completa | **PASS** (suíte API) |
| E5 | KPI → `/documents?status=` filtra lista | Implementação web (`parseDocumentListStatusParam` + `useEffect` em `documents/page.tsx`); navegador manual | **UNVERIFIED** (browser E2E não executado nesta sessão) |
| E6 | Auditoria integridade `completed` sem `finalFileKey` | `GET /digital-signer/v1/documents/integrity-audit/completed-without-final-file` + specs dedicados | **PASS** (specs); chamada HTTP live **UNVERIFIED** |

**Mobile:** **UNVERIFIED** (fora do escopo desta execução).

## Comandos executados

```bash
pnpm --filter @connexto/shared build && pnpm --filter @connexto/events build
pnpm --filter api test -- document-integrity-audit.service.spec.ts documents.controller.spec.ts envelope-audit.service.spec.ts reminder-scheduler.service.spec.ts --no-coverage
pnpm --filter api test -- --no-coverage
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api build
pnpm --filter web build
```

## Resultados resumidos

| Verificação | Resultado |
|---|---|
| Specs Incremento 5 (4 arquivos) | 34 passed, 0 failed |
| Suíte API completa | 356 passed, 46 suites |
| `api` lint | passed |
| `web` lint | passed |
| `api` build | passed |
| `web` build | passed |

## Critérios I5

| ID | Evidência |
|---|---|
| I5-AC1 | Filtro `?status=` aplicado na lista de documentos (web) |
| I5-AC2 | `DocumentIntegrityAuditService` + rota autenticada read-only |
| I5-AC3 | Este artefato + tabela E1–E6 |
| I5-AC4 | Logs JSON `reminder.skipped` / `envelope.expiration` no cron |

## Limitações

- E5 e chamada HTTP do audit endpoint não foram exercidos em browser/Postman nesta sessão.
- Tabela E1–E6 detalhada no `06-execution-plan.md` referencia “revisão anterior”; cenários acima foram alinhados ao roadmap Inc 1–4 e I5.
