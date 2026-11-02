# 08 — Registro formal de aprovação das decisões de produto

**Data da aprovação:** 2026-11-02  
**Produto:** NexoSign / Connexto Digital Signer  
**Status:** APROVADO  
**Responsável:** produto (aceite explícito registrado em sessão 2026-11-02)

Este documento consolida o registro de aprovação. Detalhe operacional duplicado em `decisions/product-approval-2026-11-02.md`. Contexto histórico e alternativas permanecem em `02-business-decisions.md` **sem** serem reescritas como se fossem novas decisões.

---

## Decisões aprovadas

| ID | Tema | Alternativa | Status |
|---|---|---|---|
| **A** | Expiração com assinaturas parciais | **A1** — `expired` + `document.expired`; sem conclusão total; sem PDF parcial automático nesta entrega | **APROVADA** |
| **B** | Fechamento manual | **B3** — ocultar/remover manual no curto prazo; `closeDocument` não operacional | **APROVADA** |
| **C** | Lembretes no sequencial | **C1** — lembrete somente para signatário da vez já convidado (`notifiedAt != null`) | **APROVADA** |

---

## Distinção de estados (obrigatória)

| Estado | Significado |
|---|---|
| **Decisão aprovada** | Política de produto congelada para planejamento e critérios de aceite (este registro + `02` / `04`). |
| **Implementação concluída** | Código mergeado na main com CI verde e critérios I1/I2 atendidos. **Não** alcançado nesta aprovação. |
| **Comportamento validado** | Evidência executável (testes, E2E, produção). Fase 0 comprova defeitos atuais; **não** valida política A1/B3/C1 em produção. |

---

## Escopo autorizado pela aprovação

**Autoriza:**

- Atualizar documentos em `reports/roadmap/` (gates, aceite, plano, prontidão).
- Executar **Fase 0 — Diagnóstico e evidência** (specs de regressão, logs, AI Memory).
- Arquivar evidências em `reports/roadmap/evidence/`.

**Não autoriza:**

- Alterar código de produção, migrations, schema ou APIs públicas.
- Merge de testes intencionalmente vermelhos na branch `main`.
- Implementação dos Incrementos 1, 2 ou posteriores sem **autorização explícita adicional**.

---

## Gates atualizados (pós-aprovação)

| Gate | Antes | Depois |
|---|---|---|
| Decisões A/B/C pendentes | Bloqueavam planejamento fino de Inc 1/2 | **Resolvido** — A1, B3, C1 aprovadas |
| Fase 0 | Pré-requisito para primeiro PR de fix | **Em execução / conclusão** — ver `evidence/inc0-repro-log-2026-11-02.md` |
| Implementação Inc 1 | Aguardava A + B | Aguarda **Fase 0 (I0-D*)** + autorização explícita de implementação |
| Implementação Inc 2 | Aguardava C | Aguarda **Inc 1 na main** + autorização explícita de implementação |

---

## Mapeamento decisão → incremento → teste Fase 0

| Decisão | Incremento de correção | Cenário Fase 0 |
|---|---|---|
| A1 | Incremento 1 | I0-AC1 |
| B3 | Incremento 1 (UI/depreciação; defeito histórico de `closeDocument` documentado em I0-AC2) | I0-AC2 |
| C1 | Incremento 2 | I0-AC3 |

---

## Referências

- `decisions/product-approval-2026-11-02.md` — registro curto espelhado
- `02-business-decisions.md` — alternativas e recomendações históricas
- `04-acceptance-criteria.md` — I0-D*, I1-AC*, I2-AC*
- `07-execution-readiness.md` — prontidão e sequência
