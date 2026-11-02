# 03 — Roadmap Priorizado

**Estratégia:** Reliability First · **Evidência:** `reports/discovery/` · **Código:** `37c8036`  
**Prioridades:** P0 bloqueador · P1 alta · P2 importante · P3 evolução

Sequência geral: **Fase 0 (diagnóstico) → 1 → 2 → 3 → 4 → 5**. Apenas incrementos **1–5** integram código/testes na main com **CI verde**. Incremento 1 aguarda decisões A e B. Incremento 2 aguarda decisão C.

---

## Fase 0 — Diagnóstico e evidência (Incremento 0 revisado)

**Prioridade:** P0 (atividade pré-merge) · **Integra na main:** **Não**

### 1. Nome

Fase 0 — Diagnóstico e evidência (baseline reproduzível)

### 2. Problema que resolve

Ausência de **prova executável** (specs + log de falha) dos três defeitos, sem bloquear CI na branch principal.

### 3. Evidências do Discovery

- `01-executive-summary.md` (tabela BROKEN/PARTIAL)
- `06-technical-assessment.md`
- `07-opportunity-backlog.md` itens 1–3, 5

### 4. Resultado esperado para o usuário

Nenhuma mudança em produção. Equipe e validadores externos têm evidência rastreável do comportamento defeituoso **antes** dos fixes.

### 5. Escopo incluído

- Redigir specs de regressão para: (a) expiração parcial → `completed` sem finalização; (b) `closeDocument` sem PDF; (c) lembrete sequencial com `notifiedAt=null`.
- Executar specs **contra a implementação atual** (branch local ou efêmera).
- Registrar saída de falha esperada em `reports/roadmap/evidence/inc0-repro-log-*.md` e AI Memory.
- Mapear cada spec ao PR futuro: AC1/AC2 → Incremento 1; AC3 → Incremento 2.

### 6. Escopo explicitamente excluído

- Merge na **main** de testes que falham.
- Correção de produção.
- UI, migrations, infra.

### 7. Dependências

- Nenhuma decisão A/B/C.

### 8. Arquivos potencialmente envolvidos (na execução da Fase 0)

- `reminder-scheduler.service.spec.ts`, `documents.service.spec.ts` (authoring; merge adiado)
- `reminder-scheduler.service.ts`, `documents.service.ts` (somente leitura para asserts)

### 9. Critérios de aceite objetivos

Ver **I0-D1..D4** em `04-acceptance-criteria.md` (diagnóstico, não merge).

### 10. Testes aplicáveis

Mesmos cenários I0-AC1..3, executados **fora** da main ou em branch descartável; falha = evidência.

### 11. Riscos

- Confundir Fase 0 com entrega mergeável — mitigado por `07-execution-readiness.md`.

### 12. Definition of Done

- Evidência dos três cenários arquivada; specs prontos para inclusion no PR de Inc 1/2; **main permanece verde**.

### 13. Métricas

- 3 cenários com log de reprodução = 100% da Fase 0.

---

## Incremento 1 — Integridade da conclusão

**Prioridade:** P0 (após decisões A e B)

### 1. Nome

Incremento 1 — Integridade da conclusão

### 2. Problema que resolve

Caminhos que marcam envelope/documento **concluído** sem PDF final, hash e eventos coerentes (expiração parcial; fechamento manual).

### 3. Evidências do Discovery

- `05-gap-analysis.md` linha “Assinatura não finaliza…”
- `06-technical-assessment.md` § Integridade do documento
- `07-opportunity-backlog.md` itens 1, 2, 5, 6

### 4. Resultado esperado para o usuário

Status e download refletem a realidade: **não** aparece “concluído” sem arquivo quando a política exige artefato; expiração emite evento correto; webhooks/auditoria recebem o que o código promete.

### 5. Escopo incluído

- **A1 (aprovada):** `processExpiredEnvelope` — parcial no prazo → `expired`; preservar assinaturas; `document.expired`; sem `document.completed`; sem PDF parcial automático; UI não como “concluído”.
- **B3 (aprovada):** ocultar/remover `closureMode` manual no wizard/settings; não expor `closeDocument`; depreciar método; manter fechamento automático.
- **Integrar na main**, no mesmo PR: teste **I0-AC1** verde; critérios **I1-AC3** (B3).
- UI mínima: mensagem quando download assinado indisponível (404 explícito) — pode ser fatia 1b se necessário, ainda P0 de integridade.

### 6. Escopo explicitamente excluído

- Lembrete sequencial (Incremento 2).
- Reenvio, cancelamento.
- Refatoração ampla fora dos caminhos de fechamento/expiração.

### 7. Dependências

- **A1 e B3 aprovadas** (2026-11-02).
- **Fase 0 concluída** (evidência I0-D*).
- **Autorização explícita** para implementação (não concedida no registro de produto 2026-11-02).

### 8. Arquivos ou módulos potencialmente envolvidos

- `reminder-scheduler.service.ts` (`processExpiredEnvelope`)
- `documents.service.ts` (`markExpired`, `closeDocument`)
- `envelope-dispatch.service.ts` (`finalizeEnvelope`)
- `apps/api/src/modules/webhooks/` (handler de eventos)
- `apps/web` — `success/page.tsx`, summary download (404 visível)

### 9. Critérios de aceite objetivos

- Testes **I0-AC1** e **I1-AC3** (B3) passam no PR.
- Para cada cenário aprovado em A: status final, presença/ausência de PDF e evento documentados em `04-acceptance-criteria.md` batem com implementação.
- Nenhum caminho de código marca `DocumentStatus.COMPLETED` sem passar pela regra aprovada (grep/review checklist).

### 10. Testes aplicáveis

| Tipo | Escopo |
|---|---|
| Unitário/integração | Expiração 0 assinaturas → `expired` + evento |
| Unitário/integração | Expiração parcial conforme decisão A |
| Unitário | `closeDocument` conforme decisão B |
| Regressão | `finalizeEnvelope` happy path intacto (`envelope-dispatch.service.spec.ts`) |

E2E opcional: envelope expirado na UI mostra estado coerente (UNVERIFIED até rodar).

### 11. Riscos e possíveis regressões

- Finalização parcial pode falhar em documentos imagem (risco já citado no Discovery).
- Webhooks duplicados se emitir evento errado — revisar handler.
- Tenants com envelopes já “completed” fantasma: **fora de escopo** de migração automática salvo decisão; documentar como dívida.

### 12. Definition of Done

- Lint + testes API tocados.
- Critérios em `04` assinados por QA/produto.
- Changelog interno ou nota de release API se comportamento visível mudar.

### 13. Métricas

- Meta: **0** novos casos `completed` sem objeto final no bucket (ver `05-success-metrics.md`).
- Requer instrumentação pós-deploy (query admin ou job de auditoria) — hipótese de implementação no Incremento 5.

---

## Incremento 2 — Confiabilidade do fluxo sequencial

**Prioridade:** P0

### 1. Nome

Incremento 2 — Confiabilidade do fluxo sequencial

### 2. Problema que resolve

Lembretes (e contadores) enviados a signatários **não convidados** ou fora da ordem no modo sequencial.

### 3. Evidências do Discovery

- `01-executive-summary.md` — lembrete sequencial BROKEN
- `02-product-inventory.md` seção F
- `06-technical-assessment.md` — `notifiedAt ?? 0`

### 4. Resultado esperado para o usuário

Quem ainda não é a vez **não** recebe lembrete nem convite fora de ordem; quem já foi convidado recebe lembretes apenas dentro da regra de intervalo e da vez.

### 5. Escopo incluído

- **C1 (aprovada):** filtrar lembretes sequenciais conforme `04` I2-AC1/AC2.
- **Integrar na main**, no mesmo PR: teste **I0-AC3** verde com fix C1.
- Opcional P1 no mesmo incremento se baixo risco: claim de lembrete só após envio bem-sucedido ou rollback.
- Testes cobrindo ordem 1→2→3 e paralelo inalterado.

### 6. Escopo explicitamente excluído

- Botão “cobrar agora” (P2).
- Mudança na UI de ordem (drag-and-drop).

### 7. Dependências

- Incremento 1 recomendado antes (evita confundir expiração com sequencial), mas tecnicamente independente.
- **Decisão C** para aceite final.

### 8. Arquivos ou módulos potencialmente envolvidos

- `reminder-scheduler.service.ts`
- `envelope-dispatch.service.ts` (invariantes de `notifyNextSigner`)
- `signing-flow.service.ts`

### 9. Critérios de aceite objetivos

- Teste Incremento 0 (sequencial) passa.
- Modo paralelo: comportamento idêntico ao baseline pré-fix (teste de não-regressão).
- `reminderCount` não incrementa para signatário sem convite.

### 10. Testes aplicáveis

| Tipo | Escopo |
|---|---|
| Unitário | Sequencial: 3 signers, só #1 convidado → cron não envia a #2/#3 |
| Unitário | Após #1 assina e #2 convidado → lembrete só #2 |
| Integração | Falha de e-mail após claim (se rollback incluído) |

### 11. Riscos e possíveis regressões

- Regressão em envelopes paralelos se filtro mal condicionado.
- Signatários com mesma `order` — validar comportamento existente no dispatch.

### 12. Definition of Done

- Specs verdes; review de `signingMode` em todo path de notificação.

### 13. Métricas

- Meta: **0** lembretes para signatários com `notifiedAt` null em sequencial.
- Log estruturado `reminder.skipped_reason` (instrumentação P1/P5).

---

## Incremento 3 — Entrega e recuperação de convites

**Prioridade:** P1–P2

### 1. Nome

Incremento 3 — Entrega e recuperação de convites

### 2. Problema que resolve

Remetente não distingue falha de entrega; não há reenvio seguro de convite (dor de mercado recorrente — `04-market-pain-research.md`).

### 3. Evidências do Discovery

- `07-opportunity-backlog.md` itens 7, 8
- `05-gap-analysis.md` e-mail/token
- `03-ux-audit.md` § corrigir erro pós-envio

### 4. Resultado esperado para o usuário

Visibilidade mínima (“convite enfileirado / enviado / falhou”) e ação de **reenviar convite** sem duplicar assinaturas nem quebrar ordem sequencial.

### 5. Escopo incluído

- Desenho + implementação MVP de reenvio (endpoint + UI mínima no tracking).
- Idempotência básica (debounce ou cooldown configurável — **decisão secundária**).
- Registrar tentativas em auditoria ou tabela existente (sem nova infra se possível).

### 6. Escopo explicitamente excluído

- Integração completa status MailerSend/bounce (pode ser fase 3b).
- SMS/WhatsApp.

### 7. Dependências

- Incrementos 1–2 (ordem e status confiáveis).
- Provedor e-mail operacional em produção UNVERIFIED — testes com mock/fila.

### 8. Arquivos ou módulos potencialmente envolvidos

- `envelope-dispatch.service.ts`
- `notifications.service.ts`, `EmailProcessor`
- `signer-tracking-panel.tsx`, envelopes API

### 9. Critérios de aceite objetivos

- Reenvio gera novo e-mail na fila; não altera token sem decisão explícita.
- Sequencial: reenvio só para signatário ativo.
- Auditoria registra ação.

### 10. Testes aplicáveis

| Tipo | Escopo |
|---|---|
| Unitário | Dispatch idempotente / cooldown |
| Integração | Fila Bull recebe job |
| E2E | Opcional: remetente clica reenviar (UNVERIFIED até Playwright) |

### 11. Riscos

- Spam ao signatário; rate limit.
- Token rotation acidental invalida link antigo — decisão de produto.

### 12. Definition of Done

- API + UI mínima + specs + documentação OpenAPI se exposta.

### 13. Métricas

- Meta: **0** falhas silenciosas de convite (fila falhou sem estado visível).
- Contagem reenvios/envelope (instrumentar).

---

## Incremento 4 — Autonomia do usuário

**Prioridade:** P2

### 1. Nome

Incremento 4 — Autonomia do usuário

### 2. Problema que resolve

Dependência de suporte para corrigir e-mail, cancelar envio ou recuperar acesso (`05-gap-analysis.md`, UX §9).

### 3. Evidências do Discovery

- `07-opportunity-backlog.md` itens 9–12
- `03-ux-audit.md` ajuda/contato inertes
- Mercado: suporte como único desbloqueio (RECORRENTE nos relatos)

### 4. Resultado esperado para o usuário

Corrigir problemas comuns **sem ticket**: cancelar envelope enviado (regra a definir), corrigir signatário antes de assinar, recuperar senha; mensagens de expiração distintas na página pública.

### 5. Escopo incluído (fatias separáveis)

- **4a P2:** Mensagens públicas `signer.expired` / erros distintos (chaves já existem).
- **4b P2:** Cancelamento pós-envio (status, webhook, notificação).
- **4c P2:** Edição de signatário (e-mail/nome) com restrições pós-assinatura.
- **4d P1 operacional:** Forgot password MVP.
- **4e P2:** Ajuda/contato funcional mínimo (href ou POST real) — escopo negócio.

### 6. Escopo explicitamente excluído

- RBAC completo, membros, convites (P3).
- Recusa formal do signatário (MISSING — decisão separada).

### 7. Dependências

- Incremento 3 desejável para reenvio consistente.
- Decisões de auditoria e permissões (hoje só owner efetivo).

### 8. Arquivos ou módulos potencialmente envolvidos

- `auth.controller.ts`, `envelopes.service.ts`, `sign/[token]/page.tsx`
- `help-section.tsx`, `contact/page.tsx`

### 9. Critérios de aceite objetivos

- Por fatia: ver `04-acceptance-criteria.md` seção Incremento 4.

### 10. Testes

- Auth specs para reset; envelopes specs para void/cancel; web component tests ausentes — E2E manual UNVERIFIED.

### 11. Riscos

- Cancelamento após assinatura parcial intersecta Decisão A.
- Reset de senha: enumeração — reutilizar padrão seguro.

### 12. Definition of Done

- Por fatia entregue; não exigir tudo de uma vez.

### 13. Métricas

- Redução de tickets (hipótese — requer baseline).
- Taxa de sucesso cancelamento/reenvio self-service.

---

## Incremento 5 — Observabilidade e validação operacional

**Prioridade:** P1–P2

### 1. Nome

Incremento 5 — Observabilidade e validação operacional

### 2. Problema que resolve

Falhas silenciosas, histórico pouco acionável, KPI quebrado, ausência de prova operacional dos fluxos corrigidos.

### 3. Evidências do Discovery

- `06-technical-assessment.md` § Observabilidade
- `03-ux-audit.md` KPI `?status=`, sino vazio
- `07-opportunity-backlog.md` itens 13–14

### 4. Resultado esperado para o usuário

Entender **o que aconteceu** com o documento (eventos, falhas, prazo) na UI e, para operadores, logs/métricas acionáveis.

### 5. Escopo incluído

- Corrigir filtro `?status=` na lista.
- Timeline/summary: incluir `viewedAt` onde aplicável (decisão UX leve).
- Job ou query de **auditoria de integridade** (completed sem file key).
- Checklist de validação E2E manual documentado (mobile ainda UNVERIFIED até execução).
- Logs estruturados para cron (reminder skip, expiration outcome).

### 6. Escopo explicitamente excluído

- Datadog/New infra obrigatória.
- DLQ UI completa.

### 7. Dependências

- Incrementos 1–2 para métricas de integridade terem sentido.

### 8. Arquivos ou módulos potencialmente envolvidos

- `documents/page.tsx`, `overview/page.tsx`
- `envelope-audit.service.ts`, `audit` module
- `reminder-scheduler.service.ts` (logging)

### 9. Critérios de aceite objetivos

- KPI link filtra lista.
- Runbook em `06-execution-plan.md` executado uma vez em staging/local com evidência.

### 10. Testes

- Web: teste mínimo de parse de query (se introduzido hook testável) ou E2E.
- API: audit job spec.

### 11. Riscos

- Expor dados sensíveis em logs — seguir AGENTS.md (sem secrets).

### 12. Definition of Done

- Métricas em `05` com pelo menos um indicador medido manualmente pós-checklist.

### 13. Métricas

- Ver `05-success-metrics.md` — habilitar contadores e auditoria periódica.

---

## Mapa de prioridades (resumo)

| Item | P | Incremento |
|---|---|---|
| Testes de reprodução (evidência Fase 0) | P0 | 0 (diagnóstico) |
| Testes regressão verdes na main | P0 | 1 (AC1/AC2), 2 (AC3) |
| Expiração / fechamento / eventos | P0 | 1 |
| Lembrete sequencial | P0 | 2 |
| 404 PDF visível | P1 | 1 ou 5 |
| Claim lembrete / rollback | P1 | 2 |
| Reenvio + visibilidade convite | P1–P2 | 3 |
| Reset senha, cancelar, corrigir | P2 | 4 |
| KPI, timeline, auditoria integridade | P2 | 5 |
| API key núcleo, planos, CLM | P3 | backlog futuro |

## Alteração em relação à hipótese inicial

A ordem **0 → 1 → 2 → 3 → 4 → 5** foi mantida. Único ajuste: **mensagem de 404** pode entrar no Incremento 1 (integridade percebida) em vez de esperar só o 5 — recomendado como **1b** ligado ao P0 de confiança no download.
