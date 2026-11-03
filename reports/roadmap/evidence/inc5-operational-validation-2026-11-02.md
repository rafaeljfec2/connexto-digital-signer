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

## Validação local E5/E6 — 2026-11-03

**Ambiente:** API `http://localhost:8083/digital-signer/v1` (branch `feature/inc5-observability-operational-validation`, commit `abe0514`); Web `http://localhost:3001` (`.env` com `NEXT_PUBLIC_API_URL` apontando para `:8083`). Postgres Docker `5433`.

**Conta de teste:** tenant criado na sessão (e-mail descartável `*@example.invalid`, 3 rascunhos). Sem produção.

### E5 — KPI + filtro (PASS)

| Item | Resultado |
|---|---|
| KPI selecionado | **Rascunho** (valor 3) |
| URL após clique | `http://localhost:3001/pt-br/documents?status=draft` |
| Lista filtrada | 3 itens “Inc5 Draft *”, coerente com API (`meta.total=3`) |
| Busca + status | Busca “Inc5 Draft 1” mantém `?status=draft` na URL e restringe visualmente |
| Observação | Com origem `127.0.0.1:3001` as chamadas à API falham por CORS; usar **`localhost:3001`** |

### E6 — HTTP audit (PASS com ressalvas)

| Caso | HTTP | Resultado |
|---|---|---|
| Autenticado `limit=10` | 200 | Payload `{ scannedAt, total, limit, records[] }`; `total=0`, `records=[]` |
| `limit=9999` | 200 | `limit` capado em **500** |
| `limit=abc` | 200 | Tratado como default **100** (não retorna 400) |
| Sem auth | **401** | “API key or Bearer token required” |
| Tenant B | 200 | `total=0` (isolamento OK vs tenant A) |
| Read-only | OK | Contagem de linhas em `documents` inalterada antes/depois |
| Detecção positiva | **Não comprovada** | DB local: `0` documentos `completed` com `final_file_key` NULL |

