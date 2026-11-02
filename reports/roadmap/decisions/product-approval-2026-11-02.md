# Registro de aprovação — Decisões de produto NexoSign

**Data:** 2026-11-02  
**Produto:** NexoSign / Connexto Digital Signer  
**Status:** APROVADO  
**Escopo autorizado:** Políticas de produto para Incrementos 1 e 2; atualização de documentos de planejamento; execução da **Fase 0** (diagnóstico).  
**Implementação (Incrementos 1+):** Não autorizada nesta aprovação.

**Registro:** aceite explícito do responsável pelo produto em 2026-11-02.

---

## Decisão A — Expiração com assinaturas parciais

**Alternativa aprovada: A1 — Expiração sem conclusão total.**

Quando o prazo de assinatura terminar e existir pelo menos uma assinatura coletada:

1. O envelope e seus documentos devem assumir o status `expired`.
2. As assinaturas já coletadas devem ser preservadas no banco de dados.
3. O sistema deve emitir `document.expired`.
4. Não deve emitir `document.completed`.
5. O documento não deve ser apresentado como totalmente concluído.
6. A geração automática de PDF parcial **não** é requisito desta entrega. PDF parcial pode ser avaliado separadamente.

**Justificativa:** status coerente com o encerramento do prazo, sem declarar concluído um documento que não atingiu a conclusão prevista.

---

## Decisão B — Fechamento manual

**Alternativa aprovada: B3 — Ocultar/remover a opção manual no curto prazo.**

1. A opção de fechamento manual não deve ser apresentada na interface.
2. A configuração `closureMode` manual deve deixar de ser oferecida ao usuário.
3. O método `closeDocument` não deve ser exposto como fluxo operacional.
4. O método existente deve permanecer deprecado ou ser alinhado a uma política válida antes de qualquer exposição futura.
5. O modo automático permanece como fluxo de fechamento do produto.

**Justificativa:** evitar operação incompleta que marca concluído sem artefato final.

---

## Decisão C — Lembretes no fluxo sequencial

**Alternativa aprovada: C1 — Lembretes somente para o signatário da vez.**

1. O signatário precisa ter recebido o convite (`notifiedAt != null`).
2. Ele precisa ser o signatário ativo na sequência.
3. Signatários cuja vez ainda não chegou não podem receber lembretes.
4. O fluxo paralelo deve preservar elegibilidade aplicável a todos os signatários **convidados**.

**Justificativa:** consistência entre ordem de convite, assinatura e lembretes.

---

## Impacto no roadmap (pós-aprovação)

| Item | Situação |
|---|---|
| Decisão A | **APROVADA — A1** |
| Decisão B | **APROVADA — B3** |
| Decisão C | **APROVADA — C1** |
| Fase 0 | **Liberada** para execução |
| Incremento 1 | Políticas A1/B3 definidas; **aguarda** conclusão da Fase 0; implementação **não** autorizada neste registro |
| Incremento 2 | Política C1 definida; sequência 1 → 2; implementação **não** autorizada neste registro |

---

## Limites desta aprovação

**Autoriza:** atualizar planejamento em `reports/roadmap/`; executar Fase 0 (diagnóstico e evidência, sem merge de testes vermelhos na main).

**Não autoriza:** correções em código de produção; migrations; UI/API; merge; deploy; Incrementos 1, 2 ou posteriores.

Implementação futura: critérios em `04-acceptance-criteria.md`; PRs com CI verde.

**Referência cruzada:** `02-business-decisions.md` (detalhe histórico e alternativas); `04-acceptance-criteria.md` (obrigações verificáveis).
