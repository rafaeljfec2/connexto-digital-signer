# 02 — Decisões de Negócio

**Base:** `reports/discovery/05-gap-analysis.md`, `06-technical-assessment.md`, `07-opportunity-backlog.md`  
**Revisão de código referenciada:** `37c8036`  
**Registro formal:** `decisions/product-approval-2026-11-02.md` (2026-11-02) · consolidação **`08-product-decisions-approval.md`**

## Status das decisões A, B e C

| Decisão | Status | Alternativa aprovada | Data | Incremento |
|---|---|---|---|---|
| **A** — Expiração parcial | **APROVADA** | **A1** | 2026-11-02 | 1 |
| **B** — Fechamento manual | **APROVADA** | **B3** | 2026-11-02 | 1 |
| **C** — Lembrete sequencial | **APROVADA** | **C1** | 2026-11-02 | 2 |

**Implementação dos Incrementos 1 e 2:** não autorizada pelo registro de aprovação de 2026-11-02 — apenas planejamento e **Fase 0**.

As seções abaixo mantêm **contexto, alternativas e recomendações históricas** do Discovery. Obrigações verificáveis para engenharia estão em `04-acceptance-criteria.md`.

---

## Quadro resumo (pós-aprovação)

| Decisão | Política aprovada | Impacto resumido | Planejamento | Implementação |
|---|---|---|---|---|
| **A** | A1 — `expired` + `document.expired`; sem PDF parcial auto | Cron, eventos, UI não “concluído” | Liberado | Após Fase 0 + PR Inc 1 |
| **B** | B3 — ocultar manual; `closeDocument` não operacional | Wizard/settings web | Liberado | Após Fase 0 + PR Inc 1 |
| **C** | C1 — lembrete só signatário ativo convidado | `reminder-scheduler` | Liberado | Após Inc 1 + PR Inc 2 |

---


## Decisão A — Expiração de documentos com assinaturas parciais

### Contexto atual

- Envelopes pendentes têm `expiresAt`. Cron horário (`reminder-scheduler.service.ts`, chave `nexosign:cron:expired-envelopes`) executa `processExpiredEnvelope`.
- Se **nenhum** signatário assinou → envelope e documentos vão para `expired` (comportamento coerente com “prazo para assinar”).
- Se **ao menos um** signatário assinou → status vira `completed` **sem** chamar `finalizeEnvelope`, **sem** PDF final, **sem** `finalHash`, **sem** `document.completed` nem `document.expired`.
- `DocumentsService.markExpired` emite `document.expired` corretamente, mas **não é chamada** pelo cron (apenas evidenciada em testes isolados do método).

### Comportamento encontrado (fato)

O remetente/signatário pode ver “concluído” e o download do assinado retorna 404. Webhooks e auditoria não recebem o evento de expiração no caminho real do cron. Dor de mercado **análoga** (não equivalente): finalização/download indisponível (ZapSign fev/2026; Clicksign out/2026) — `04-market-pain-research.md`.

### Alternativas possíveis

| ID | Política | Status final | PDF / evidências | Eventos |
|---|---|---|---|---|
| **A1** | Prazo encerrado = falha de conclusão total | `expired` (envelope + documentos) | Preservar assinaturas já coletadas no banco; **não** prometer PDF “final” completo; opcionalmente gerar PDF parcial via mesma pipeline de finalização | `document.expired` (e não `document.completed`) |
| **A2** | Prazo encerrado com assinaturas parciais = encerramento administrativo | `completed` ou novo status dedicado (ex.: `closed_partial`) | **Obrigatório** gerar PDF com assinaturas existentes + página de evidências indicando incompletude | `document.completed` com metadado de incompletude **ou** novo evento (exige decisão de webhook) |
| **A3** | Prazo encerrado = expirado; PDF parcial sob demanda | `expired` | PDF parcial gerado só quando remetente solicita download “como estava no prazo” | `document.expired` + eventual evento de download |
| **A4** | Manter comportamento atual | `completed` sem PDF | Nenhum artefato final | Nenhum evento adicional |

### Consequências

- **A1:** Alinha status com expectativa “não fechou a tempo”; exige copy na UI (“expirado”, não “concluído”). Signatários pendentes deixam de assinar. Evidências jurídicas dependem do que foi assinado antes — produto deve deixar claro que não há documento único “fechado”.
- **A2:** Melhor para quem precisa de arquivo baixável com o que já foi assinado; exige implementação completa de finalização parcial e definição clara na UI/webhooks.
- **A3:** Menor mudança de status; complexidade operacional no download e suporte.
- **A4:** Mantém defeito de integridade; **incompatível** com estratégia “Reliability First”.

### Recomendação técnica e de produto

- **Recomendação:** rejeitar **A4**. Entre **A1** e **A2**, preferir **A1** como padrão mínimo seguro (status honesto + `document.expired`) se não houver requisito legal explícito de entregar PDF parcial automaticamente; se o negócio exigir arquivo, escolher **A2** com PDF parcial **obrigatório** e texto de evidência explícito — nunca `completed` sem objeto no bucket.
- **Recomendação técnica:** unificar transição de expiração em um único serviço de domínio (reutilizar `finalizeEnvelope` ou extrair “closure” compartilhado), emitir eventos já definidos em `@connexto/events` antes de novos nomes.

### Decisão aprovada (2026-11-02): **A1**

- [x] Status final com assinaturas parciais no prazo vencido: **`expired`** (envelope e documentos).
- [x] PDF parcial automático: **fora do escopo** desta entrega.
- [x] Evidências: assinaturas preservadas no banco; **`document.expired`**; **não** `document.completed`; UI não trata como totalmente concluído.

---

## Decisão B — Fechamento manual (`closureMode`)

### Contexto atual

- Coluna `closureMode` em envelope/template/tenant (`envelope.entity.ts`, settings do wizard).
- `DocumentsService.closeDocument` exige documento `pending_signatures`, grava `completed`, emite `document.completed`, **não** gera PDF.
- **Não há controller/rota** identificada que chame `closeDocument` em produção (`02-product-inventory.md`, seção C).
- Finalização real ocorre em `envelope-dispatch.service.ts` → `finalizeEnvelope` quando todos assinam.

### Comportamento encontrado (fato)

Configuração sugere opção “manual”, mas o operador não tem fluxo completo ligado. Se alguém passar a chamar `closeDocument` no futuro, reproduz o mesmo problema da expiração parcial: concluído sem artefato.

### Alternativas possíveis

| ID | Política | UI / API | Efeito |
|---|---|---|---|
| **B1** | Fechamento manual é requisito | Expor rota autenticada + ação na UI | Deve invocar a **mesma** finalização que `finalizeEnvelope` (com regra explícita para signatários pendentes: ignorados, recusados ou marcados como não aplicáveis) e só então `completed` + PDF |
| **B2** | Fechamento manual = encerrar sem todos, sem PDF “completo” | Rota + confirmação forte | Status dedicado ou `expired`/`cancelled`; **proibido** `completed` sem PDF se a UI promete download |
| **B3** | Não é necessário no curto prazo | Remover ou ocultar `closureMode` manual na UI; manter só `automatic` | Evita falsa expectativa; `closeDocument` deprecado ou alinhado a B1/B2 antes de qualquer exposição |
| **B4** | Manter coluna e método sem rota | Sem mudança | Dívida latente; risco se alguém expuser o método |

### Consequências

- **B1:** Maior esforço; atende casos “aceitar assinaturas recebidas e encerrar” (comum em mercado, mas **não** validado com usuários NexoSign neste Discovery).
- **B2:** Clareza legal/operacional; pode frustrar quem espera “documento assinado” completo.
- **B3:** Menor superfície; pode remover opção já visível no wizard — verificar i18n/settings antes de ocultar.
- **B4:** Inconsistente com “Reliability First”.

### Recomendação técnica e de produto

- **Recomendação:** **B3** até existir demanda validada; se a opção manual permanecer visível, tratar como **B1** (fechar = finalizar com regra de incompletude documentada), nunca status `completed` vazio.
- **Recomendação técnica:** uma única função de “fechamento” usada por expiração (Decisão A), fechamento manual e último signatário.

### Decisão aprovada (2026-11-02): **B3**

- [x] Fechamento manual na UI: **não oferecer** (`closureMode` manual removido/oculto).
- [x] `closeDocument`: **não expor** como fluxo operacional; manter **deprecado** até política futura.
- [x] Fechamento do produto: **automático** (`finalizeEnvelope` quando todos assinam).

---

## Decisão C — Fluxo sequencial (convite vs lembrete)

### Contexto atual

- No envio (`envelope-dispatch.service.ts`): modo sequencial valida `order` e **notifica apenas o primeiro** signatário pendente; próximo é notificado no aceite (`notifyNextSigner`).
- Signatário convidado recebe `notifiedAt` no convite; quem ainda não foi convidado mantém `notifiedAt` **nulo**.
- Cron de lembretes (`processEnvelopeReminders`): busca **todos** signatários `pending` do envelope, **ignora** `signingMode`.
- Elegibilidade de lembrete: `lastNotified = notifiedAt ?? 0` → quem nunca foi convidado parece “notificado na época zero” e passa no intervalo no primeiro tick do cron.

### Comportamento encontrado (fato)

Lembretes podem ser enviados a signatários que ainda não receberam convite; consome contador `reminderCount` (máx. 3) indevidamente. Claim atualiza `notifiedAt` mesmo quando o e-mail falha depois do claim.

### Alternativas possíveis (regras de elegibilidade)

| ID | Regra de convite | Regra de lembrete |
|---|---|---|
| **C1** | Só o menor `order` entre `pending` com convite enviado ou o primeiro `pending` sem convite após o anterior `signed` | Lembrete apenas se `notifiedAt != null` **e** signatário é o “ativo” (menor `order` pendente cujo antecessor já assinou) |
| **C2** | Igual ao envio atual | Lembrete para qualquer `pending` com `notifiedAt != null` (paralelo inalterado; sequencial só lembra quem já foi convidado) |
| **C3** | Reconvite automático se lembrete disparar antes do convite (anti-padrão) | Não recomendado — mistura convite e lembrete |

### Consequências

- **C1:** Mais restritivo; evita e-mail fora de ordem; exige testes claros de ordem e empates.
- **C2:** Corrige o bug imediato (`notifiedAt` nulo); ainda pode lembrar signatário “convidado” que não é a vez se houver bug de ordem no dispatch — mitigado se dispatch mantiver invariante “só um convite ativo”.
- **C3:** Aumenta confusão do signatário.

### Recomendação técnica e de produto

- **Recomendação:** **C1** para sequencial (convite + lembrete alinhados à mesma “vez”); **C2** mínimo aceitável se C1 atrasar — ainda corrige P0 do Discovery.
- **Recomendação técnica complementar (não substitui decisão C):** revert claim de lembrete se envio falhar após claim, ou claim só após sucesso do provider — item P1 do backlog (`07-opportunity-backlog.md` item 4).

### Decisão aprovada (2026-11-02): **C1**

- [x] Lembrete sequencial **somente** para signatário da vez.
- [x] `notifiedAt` nulo: **nunca** elegível a lembrete.
- [x] Paralelo: lembretes para signatários **convidados** (`notifiedAt != null`), comportamento atual preservado onde já correto.

---

## Decisões secundárias (ainda pendentes)

| Tema | Contexto | Status | Incremento típico |
|---|---|---|---|
| Reenvio de convite | MISSING | Pendente | 3 |
| Cancelamento pós-envio | MISSING | Pendente | 4 |
| Correção de e-mail do signatário | MISSING | Pendente | 4 |
| PDF parcial automático | Decisão A1 excluiu do Inc 1 | Fora do Inc 1; avaliação futura | backlog |
| Expor fechamento manual | B3 rejeita no curto prazo | Resolvido por B3 | — |

---

## Matriz: planejamento e implementação (pós-aprovação A/B/C)

| Trabalho | Planejamento | Implementação autorizada |
|---|---|---|
| Fase 0 — diagnóstico | **Liberada** | **Sim** (somente diagnóstico; sem fix na main) |
| Incremento 1 — A1 + B3 | Critérios em `04` | **Não** até nova autorização + Fase 0 concluída |
| Incremento 2 — C1 | Critérios em `04` | **Não** até Inc 1 integrado |
| Incremento 3–5 | Condicionado | **Não** nesta aprovação |
