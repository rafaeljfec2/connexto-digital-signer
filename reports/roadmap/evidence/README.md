# Evidências da Fase 0 (diagnóstico)

Esta pasta guarda **logs e notas de reprodução** dos três defeitos críticos.

- **Não** substitui testes na base de código após correção.
- Artefatos aqui podem ser commitados; **testes vermelhos não** entram na branch principal.

Modelo de arquivo: `inc0-repro-log-YYYY-MM-DD.md` com commit, comandos, saída por cenário e classificação.

---

## Índice de execuções

| Data | Log | Commit | Branch / worktree | Resultado |
|---|---|---|---|---|
| 2026-11-02 | [inc0-repro-log-2026-11-02.md](./inc0-repro-log-2026-11-02.md) | `590966655fecd8cca09d83b8797d3537801cb5dc` | `phase0/inc0-diagnostic-evidence-2026-11-02` | I0-AC1/2/3 **REPRODUZIDO** |

---

## Mapeamento cenário → teste → incremento

| Cenário | Describe / teste (spec) | Incremento de correção | Decisão |
|---|---|---|---|
| **I0-AC1** | `I0-AC1 (policy A1 — partial signatures at expiry)` · `reminder-scheduler.service.spec.ts` | **Incremento 1** | A1 |
| **I0-AC2** | `I0-AC2 (policy B3 — closeDocument must not complete without final artifact)` · `documents.service.spec.ts` | **Incremento 1** (fix A1 + B3 UI; I0-AC2 evidencia `closeDocument`) | B3 |
| **I0-AC3** | `I0-AC3 (policy C1 — sequential reminder eligibility)` · `reminder-scheduler.service.spec.ts` | **Incremento 2** | C1 |

Critérios detalhados: `../04-acceptance-criteria.md` (I0-D*, I1-AC*, I2-AC*).
