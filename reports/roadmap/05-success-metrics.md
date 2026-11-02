# 05 — Métricas de Sucesso

**Objetivo:** distinguir **metas futuras** (após correções) de **indicadores** mensuráveis hoje e o que ainda precisa **instrumentação**.

**Baseline de evidência:** Discovery 2026-11-02 não reexecutou produção; contagens históricas em produção são **hipótese** até query.

---

## Metas futuras (pós Incrementos 1–2, validação contínua)

| Meta | Definição operacional | Meta numérica |
|---|---|---|
| Conclusões sem PDF final | Envelope ou documento em status equivalente a “concluído” para o usuário, sem objeto final assinado no storage (ou sem hash final registrado quando a política exige) | **0** novos casos por janela rolling 30d |
| Lembretes fora de ordem | E-mail de lembrete enviado a signatário sequencial com `notifiedAt` null OU order maior que o signatário ativo | **0** por janela 30d |
| Inconsistência status vs evidência | `completed` (ou rótulo UI “concluído”) sem download assinado disponível quando política promete arquivo | **0** novos |
| Eventos críticos sem rastreabilidade | Transição de expiração/conclusão sem `audit_logs` ou webhook correspondente à política | **0** |
| Falhas silenciosas de convite | Job de e-mail falhou após enqueue e UI mostra apenas “enviado” ou nada | **0** (Incremento 3+) |
| Operações críticas duplicadas indevidamente | Dois PDF finais distintos ou dois `document.completed` para o mesmo fechamento | **0** |

---

## Indicadores que já existem (parcialmente)

| Indicador | Fonte hoje | Limitação |
|---|---|---|
| Saúde API | `GET /digital-signer/v1/health`, `/live` | Liveness não inclui Postgres/Redis (`06-technical-assessment.md`) |
| Logs de request | Fila `api-request-logs`, UI `/developers/logs` | Não agrega métricas de produto |
| Logs de cron | Logger Nest em `reminder-scheduler.service.ts` | Texto livre; sem contador |
| `reminderCount` por signatário | Coluna DB + tracking UI | Não prova entrega |
| Webhook deliveries | Tabela/fila + retry manual | Expiração real pode não emitir evento hoje |
| Hashes no summary | UI + DB | Não recomputa sob demanda |

---

## Instrumentação necessária (recomendada)

| Métrica | Como medir | Incremento sugerido | Esforço relativo |
|---|---|---|---|
| `completed_without_final_artifact` | Job SQL: join envelope/document status vs `finalFileKey` / `finalHash` | 5 | Baixo se colunas existirem |
| `reminder_skipped_reason` | Log estruturado + agregação (grep/Loki futuro) | 2, 5 | Baixo |
| `reminder_sent_out_of_turn` | Assert em testes CI + log em prod | 2 | Médio |
| `expiration_outcome` | Enum no log: `expired_empty`, `expired_partial`, `completed_all` | 1 | Baixo |
| `invite_send_status` | Estado por signer: queued/sent/failed (coluna ou audit) | 3 | Médio |
| `resend_count` | Contador por envelope | 3 | Baixo |
| Taxa download 404 pós-completed | Log API 404 em `GET .../signed` | 1, 5 | Baixo |

**Não recomendado agora:** stack nova de métricas (Prometheus) sem necessidade — logs estruturados + job de auditoria atendem “Reliability First”.

---

## Como validar cada meta (procedimento)

### Conclusões sem PDF final

1. Após Incremento 1, rodar job de auditoria (Incremento 5) diariamente em staging/prod.
2. Query exemplificativa (hipótese — validar nomes de coluna no schema antes de usar):

```sql
-- Hypothesis only: validate column names against TypeORM migrations before use
SELECT e.id, e.status, d.id AS document_id, d.status AS doc_status, d.final_file_key
FROM envelopes e
JOIN documents d ON d.envelope_id = e.id
WHERE e.status = 'completed'
  AND (d.final_file_key IS NULL OR d.final_file_key = '');
```

3. **Meta:** resultado vazio para novos registros após deploy.

### Lembretes fora de ordem

1. Testes CI verdes I2-AC1–AC3 (prova contínua).
2. Em prod: buscar logs `Reminder` + envelope id sequencial onde destinatário tinha `notifiedAt` null no momento do envio — requer log enriquecido (instrumentação).

### Eventos críticos

1. Para cada expiração/conclusão em teste de integração, assert `EVENT_DOCUMENT_EXPIRED` ou `EVENT_DOCUMENT_COMPLETED`.
2. Em prod: amostrar webhook deliveries vs transições (manual até dashboard).

### Falhas silenciosas de convite

1. Simular falha MailerSend em staging após Incremento 3.
2. UI/API deve mostrar falha — checklist I3-AC5.

---

## Métricas de experiência (UNVERIFIED até E2E)

| Métrica | Método | Status |
|---|---|---|
| Taxa conclusão fluxo público mobile | Playwright + device farm | Não instrumentado |
| Tempo médio envio wizard | Analytics | Não existe |
| NPS / CSAT | Pesquisa | Fora de escopo |

---

## Métricas de processo de execução (roadmap)

| Indicador | Uso |
|---|---|
| Cenários com log de reprodução (Fase 0) | Gate antes do Inc 1; meta 3/3 |
| Incrementos entregues vs planeados | Steering, sem prazo fixo neste doc |
| Critérios I*-AC* fechados em `04` | Gate de release |
| Decisões A/B/C status | A1, B3, C1 **aprovadas** 2026-11-02; ver `decisions/product-approval-2026-11-02.md` |

---

## Resumo para aprovação

Priorizar instrumentação **barata** alinhada aos Incrementos 1, 2 e 5: auditoria SQL de integridade, logs estruturados de cron, estado de convite. Metas numéricas **zero** aplicam-se a **novos** incidentes após deploy; dados legados podem exigir **decisão** sobre remediação (fora deste roadmap).
