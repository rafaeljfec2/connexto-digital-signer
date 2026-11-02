# Fase 0 — Log de reprodução (Incremento 0)

**Data/hora:** 2026-11-02T19:18:50-03:00 (America/Sao_Paulo)  
**Repositório:** `rafaeljfec2/connexto-digital-signer` (local: `connexto-digital-signer`)  
**Commit testado:** `590966655fecd8cca09d83b8797d3537801cb5dc`  
**Branch:** `main` (alterações da Fase 0 no working tree local; sem worktree separado)  
**Nota:** worktree `connexto-digital-signer-phase0` foi removido a pedido — evidência permanece neste repositório.

## Decisões de produto (referência)

Aprovação formal **2026-11-02:** **A1**, **B3**, **C1** (`08-product-decisions-approval.md`, `decisions/product-approval-2026-11-02.md`).

## Ambiente

| Item | Valor |
|---|---|
| Node | v24.22.1 |
| pnpm | 9.0.0 |
| Pré-requisito build | `pnpm --filter @connexto/shared build && pnpm --filter @connexto/events build` (worktree novo sem artefatos pré-buildados) |
| Comando de teste API | `pnpm --filter api test -- <spec> --no-coverage` |

## Estado inicial Git (worktree base)

```
590966655fecd8cca09d83b8797d3537801cb5dc on phase0/inc0-diagnostic-evidence-2026-11-02
main @ same commit, working tree clean before worktree add
```

## Arquivos de teste criados/alterados (somente specs)

| Arquivo | Alteração |
|---|---|
| `apps/api/src/modules/notifications/services/reminder-scheduler.service.spec.ts` | + `I0-AC1`, + `I0-AC3` |
| `apps/api/src/modules/documents/services/documents.service.spec.ts` | + `I0-AC2` |

**Código de produção:** nenhum arquivo `.ts` de serviço/controller/entity alterado nesta Fase 0.

---

## Baseline (suíte existente antes dos cenários I0)

### Comando

```bash
pnpm --filter @connexto/shared build && pnpm --filter @connexto/events build
pnpm --filter api test -- reminder-scheduler.service.spec.ts --no-coverage
pnpm --filter api test -- documents.service.spec.ts --no-coverage
```

### Resultado

| Spec | Exit | Tests passed | Tests failed |
|---|---|---|---|
| `reminder-scheduler.service.spec.ts` (9 testes legados) | 0 | 9 | 0 |
| `documents.service.spec.ts` (31 testes legados) | 0 | 31 | 0 |

Confirma que a suíte **anterior** não cobria os três defeitos (nenhuma falha na baseline legada).

---

## Execução por cenário (pós-inclusão I0-AC*)

### I0-AC1 — Expiração com assinaturas parciais (política A1)

**Comando:**

```bash
pnpm --filter api test -- reminder-scheduler.service.spec.ts --testNamePattern="I0-AC1" --no-coverage
```

**Exit code:** 1  

**Classificação:** **REPRODUZIDO**

**Asserção de negócio:** envelope e documentos devem ir para `expired` quando há ≥1 assinatura e prazo vencido.

**Saída relevante:**

```
Expected: { "status": "expired" }
Received: { "status": "completed" }
(at expect(managerUpdate).toHaveBeenCalledWith(Envelope, ..., { status: EnvelopeStatus.EXPIRED }))
```

**Justificativa:** `processExpiredEnvelope` define `newStatus = signedSigners.length > 0 ? COMPLETED : EXPIRED` (`reminder-scheduler.service.ts`), violando A1. Assinaturas `signed` permanecem no mock (não há delete no serviço); gap adicional: cron **não** emite `document.expired` (não coberto neste unit test — `markExpired` existe em `DocumentsService` mas não é invocado pelo cron).

---

### I0-AC2 — Fechamento manual sem PDF final (política B3 / defeito histórico)

**Comando:**

```bash
pnpm --filter api test -- documents.service.spec.ts --testNamePattern="I0-AC2" --no-coverage
```

**Exit code:** 1  

**Classificação:** **REPRODUZIDO**

**Asserção de negócio:** documento **não** deve ficar `completed` nem emitir `document.completed` sem `finalFileKey`.

**Saída relevante:**

```
expect(received).not.toBe(expected)
Expected: not "completed"
(at expect(result.status).not.toBe(DocumentStatus.COMPLETED))
```

**Justificativa:** `closeDocument` grava `COMPLETED` e emite `EVENT_DOCUMENT_COMPLETED` sem exigir `finalFileKey` (`documents.service.ts`). B3 no Incremento 1 tratará exposição UI/depreciação; I0-AC2 documenta o comportamento atual do método.

---

### I0-AC3 — Lembrete sequencial antes do convite (política C1)

**Comando:**

```bash
pnpm --filter api test -- reminder-scheduler.service.spec.ts --testNamePattern="I0-AC3" --no-coverage
```

**Exit code:** 1  

**Classificação:** **REPRODUZIDO**

**Setup:** envelope `signingMode: sequential`, signatário `pending`, `notifiedAt: null`, `reminderCount: 0`.

**Asserção de negócio:** nenhum lembrete nem incremento de `reminderCount` para signatário não convidado.

**Saída relevante:**

```
expect(signerRepository.update).not.toHaveBeenCalled()
Number of calls: 1
Received call: reminderCount 0 → 1, notifiedAt set
```

**Justificativa:** `sendReminderIfDue` usa `lastNotified = notifiedAt ? ... : 0`, tratando “nunca convidado” como elegível após o intervalo; `processEnvelopeReminders` não filtra `signingMode` nem `notifiedAt`.

**Nota:** primeira execução sem mock de `signerRepository.update` gerou `TypeError` (claim undefined) — classificada **INVÁLIDA**; setup corrigido **somente na spec**; reexecução **REPRODUZIDO**.

---

## Suíte direcionada combinada

**Comando:**

```bash
pnpm --filter api test -- reminder-scheduler.service.spec.ts documents.service.spec.ts --no-coverage
```

**Exit code:** 1  
**Tests:** 40 passed, **3 failed** (I0-AC1, I0-AC2, I0-AC3), 43 total.

---

## Mapeamento para incrementos futuros

| Cenário | PR alvo | Critérios relacionados |
|---|---|---|
| I0-AC1 | Incremento 1 | I1-AC2, I0-D2 |
| I0-AC2 | Incremento 1 (evidência); B3 via I1-AC3 | I1-AC3, I0-D2 |
| I0-AC3 | Incremento 2 | I2-AC1–AC2, I0-D2 |

---

## Limitações

- Comportamento em produção FlowDeploy **não** revalidado nesta Fase 0 (permanece UNVERIFIED do Discovery).
- I0-AC1 não asserta emissão de `document.expired` no cron (ausência de `EventEmitter` em `ReminderSchedulerService`); gap documentado para Incremento 1.
- Specs I0 permanecem **fora da `main`** até PR de correção com testes verdes.

---

## Gate I0-D1..D4

| ID | Atendido |
|---|---|
| I0-D1 | Sim — três specs nomeados |
| I0-D2 | Sim — três falhas REPRODUZIDAS |
| I0-D3 | Sim — commit SHA registrado |
| I0-D4 | Sim — mapeamento em `07-execution-readiness.md` + este log |

**Status Fase 0:** **CONCLUÍDA** (worktree/branch isolada; `main` não alterada).
