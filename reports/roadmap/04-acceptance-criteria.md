# 04 — Critérios de Aceite, Testes e Definition of Done

**Referência:** `03-prioritized-roadmap.md`, `02-business-decisions.md`, `decisions/product-approval-2026-11-02.md`  
**Decisões A/B/C:** aprovadas 2026-11-02 (A1, B3, C1). Critérios `@requires-decision-*` abaixo refletem política **aprovada**, não hipótese.

---

## Definition of Done global (todo incremento integrado na main)

1. Código mergeável com lint do pacote tocado (`pnpm --filter api lint` / `web lint` se aplicável).
2. **CI verde:** todos os testes do pacote tocado passam; nenhum teste deixado falhando de propósito na branch principal.
3. Testes novos ou atualizados passando localmente; descrições de teste em **inglês**.
4. Nenhum segredo ou `.env` commitado.
5. Comportamento documentado: se mudança visível, entrada mínima em notas de release ou comentário de PR.
6. Critérios deste documento para o incremento marcados como atendidos.
7. Decisões de produto referenciadas no PR quando `@requires-decision-*`.

**Fase 0 (diagnóstico)** não exige merge na main; DoD específico em I0-D* abaixo.

---

## Fase 0 — Diagnóstico e evidência (não merge de testes vermelhos)

### Critérios de aceite (diagnóstico)

| ID | Critério | Verificação |
|---|---|---|
| I0-D1 | Specs redigidos para I0-AC1, I0-AC2, I0-AC3 (cenários nomeados) | Revisão em branch ou anexo |
| I0-D2 | Executados contra código atual; **falham** como esperado | Log em `reports/roadmap/evidence/inc0-repro-log-*.md` |
| I0-D3 | Evidência referencia commit/revisão testada | Hash ou tag no log |
| I0-D4 | Mapeamento documentado: AC1/AC2 → PR Incremento 1; AC3 → PR Incremento 2 | `07-execution-readiness.md` |

### Especificação dos testes (integrados verdes depois)

| ID | Cenário | Merge na main |
|---|---|---|
| I0-AC1 | Expiração com ≥1 `signed` → hoje `completed` sem finalização/PDF | **Incremento 1** (com fix) |
| I0-AC2 | `closeDocument` hoje → `completed` sem arquivo final (diagnóstico do defeito; Inc 1 aplica **B3**, não fix do método) | **Incremento 1** (UI/ocultação + depreciação; ver I1-AC3) |
| I0-AC3 | Lembrete sequencial, `notifiedAt=null` → envio indevido | **Incremento 2** (com fix) |

### DoD Fase 0

- Main **não** recebe testes falhando.
- AI Memory ou `evidence/` contém saída dos três cenários.

### Fora de escopo Fase 0

- Correção dos bugs; merge de specs vermelhos.

---

## Incremento 1 — Integridade da conclusão

### Critérios de aceite

| ID | Critério | Verificação |
|---|---|---|
| I1-AC1 | Expiração com zero assinaturas → `expired` + `document.expired` (ou equivalente por documento) | Spec + event emitter assert |
| I1-AC2 | **A1 aprovada:** expiração com ≥1 assinatura → envelope e documentos `expired`; assinaturas preservadas; emite `document.expired`; **não** emite `document.completed`; **não** gera PDF parcial automático | Spec + event emitter; assert ausência de `COMPLETED` |
| I1-AC3 | **B3 aprovada:** UI não oferece `closureMode` manual; nenhuma rota/controller expõe `closeDocument`; método marcado deprecado (ou equivalente documentado); fechamento operacional só automático | Spec API + revisão web settings/wizard |
| I1-AC4 | Nenhum novo caminho para `COMPLETED` sem regra aprovada | Code review checklist |
| I1-AC5 | Download assinado inexistente → UI/summary exibe erro explícito (não silencioso) | Teste web se viável; senão checklist manual |
| I1-AC6 | Testes **I0-AC1** e **I0-AC2** passam no PR do Incremento 1 | CI |

### Matriz decisão A — **A1 aprovada 2026-11-02**

| Política | Status envelope/documentos | PDF automático | Eventos | UI |
|---|---|---|---|---|
| **A1** (aprovada) | `expired` | Nenhum parcial auto nesta entrega | `document.expired` apenas | Não apresentar como totalmente concluído |

### Testes

- Regressão: `envelope-dispatch.service.spec.ts` finalize happy path.
- Novos: `processExpiredEnvelope-after-decision-A.spec.ts`.
- `documents.service.spec.ts` — `closeDocument-after-decision-B`.

### DoD específico

- PR referencia `decisions/product-approval-2026-11-02.md` (A1, B3).

---

## Incremento 2 — Confiabilidade sequencial

### Critérios de aceite

| ID | Critério | Verificação |
|---|---|---|
| I2-AC1 | **C1 aprovada:** lembrete não enviado se `notifiedAt` null | Spec |
| I2-AC2 | **C1 aprovada:** sequencial — lembrete só signatário **ativo** (menor `order` pendente elegível na sequência) | Spec com 3 signers |
| I2-AC3 | Paralelo: todos convidados continuam elegíveis a lembrete | Spec não-regressão |
| I2-AC4 | Teste **I0-AC3** passa no PR do Incremento 2 | CI |
| I2-AC5 | (P1 opcional) Falha de envio não consome lembrete definitivamente | Spec com mock throw |

### Testes

- `reminder-scheduler.service.spec.ts` — suite `sequential eligibility`.
- Opcional: integração com `envelope-dispatch.service.spec.ts` ordem de convite.

### DoD específico

- Log em inglês quando lembrete skipped (`sequential-not-active`).

---

## Incremento 3 — Entrega e recuperação de convites

| ID | Critério | Verificação |
|---|---|---|
| I3-AC1 | Endpoint autenticado de reenvio de convite por signer ou envelope | Controller spec |
| I3-AC2 | Sequencial: reenvio negado fora da vez | Spec |
| I3-AC3 | Cooldown ou idempotência documentada | Spec + doc API |
| I3-AC4 | Entrada de auditoria por reenvio | Assert audit log ou event |
| I3-AC5 | UI tracking expõe ação e estado mínimo de falha de fila | Checklist manual UNVERIFIED |

---

## Incremento 4 — Autonomia (por fatia)

### 4a — Mensagens públicas

| ID | Critério |
|---|---|
| I4a-AC1 | Envelope expirado usa copy `signer.expired`, não cartão genérico |
| I4a-AC2 | Envelope completed para signatário usa `signer.completed` quando aplicável |

### 4b — Cancelamento

| ID | Critério |
|---|---|
| I4b-AC1 | Ação cancela envelope enviado; status final definido por produto |
| I4b-AC2 | Signatários pendentes não assinam após cancelamento |
| I4b-AC3 | Webhook/evento se aplicável |

### 4c — Correção signatário

| ID | Critério |
|---|---|
| I4c-AC1 | Editar e-mail/nome permitido só se signer não `signed` |
| I4c-AC2 | Reenvio ou invalidação de token conforme decisão |

### 4d — Reset senha

| ID | Critério |
|---|---|
| I4d-AC1 | Fluxo forgot + reset com token expirável |
| I4d-AC2 | Resposta não enumera e-mail inexistente (ou padrão único) |

### 4e — Ajuda/contato

| ID | Critério |
|---|---|
| I4e-AC1 | Links de ajuda navegam ou abrem destino real |
| I4e-AC2 | Contato envia para canal definido (e-mail/API) |

---

## Incremento 5 — Observabilidade

| ID | Critério | Verificação |
|---|---|---|
| I5-AC1 | `/documents?status=` da KPI aplica filtro | Teste ou E2E |
| I5-AC2 | Script/job detecta `completed` sem `finalFileKey` (ou equivalente) | Spec job |
| I5-AC3 | Runbook E2E (`06-execution-plan.md`) executado com evidência anexada | Artefato manual |
| I5-AC4 | Cron loga outcome de expiração e skip de lembrete | Inspeção log test |

---

## Tipos de teste recomendados por camada

| Camada | Ferramenta | Quando |
|---|---|---|
| Unitário serviço API | Jest + mocks TypeORM existentes | Regras de elegibilidade, status |
| Integração API | Jest + transaction fixtures | Cron, dispatch + reminder |
| Contrato eventos | Assert payload `@connexto/events` | Incremento 1 |
| Web | Ausente hoje — introduzir teste de util/query ou Playwright incremental | Incremento 5+ |
| E2E manual | Checklist | Fluxo feliz + sequencial + expiração |

---

## Rastreabilidade Discovery → Aceite

| Achado Discovery | Critérios |
|---|---|
| Expiração parcial → completed sem PDF | I0-AC1, I0-D2, I1-AC2, I5-AC2 |
| closeDocument sem PDF | I0-AC2, I0-D2, I1-AC3 |
| Lembrete sequencial | I0-AC3, I0-D2, I2-AC1–AC3 |
| document.expired não emitido no cron | I1-AC1, I1-AC2 |
| 404 silencioso | I1-AC5 |
| Reenvio convite MISSING | I3-AC1 |
| KPI status | I5-AC1 |

---

## Definition of Ready (antes de codar Incremento 1)

- [x] Decisões **A** e **B** aprovadas — **A1**, **B3** (2026-11-02).
- [ ] Fase 0 concluída (I0-D1..D4); evidência arquivada.
- [x] Critérios I1-AC2 / I1-AC3 alinhados à aprovação (`04` e `product-approval-2026-11-02.md`).
- [ ] Autorização explícita para **implementação** do Incremento 1 (fora do escopo da aprovação de produto de 2026-11-02).

## Definition of Ready (Incremento 2)

- [x] Decisão **C** aprovada — **C1** (2026-11-02).
- [ ] Incremento 1 integrado na main com CI verde.
- [ ] Autorização explícita para **implementação** do Incremento 2.
