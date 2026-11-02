# 02 — Product Inventory

**Revisão:** `37c8036` · **Data:** 2026-11-02 · **Método:** leitura de código, migrations e testes. Existência de tabela não conta como funcionalidade entregue.

## Legenda

| Status | Significado |
|---|---|
| DONE | Caminho de código coerente entre regra, API e, quando existe, tela. |
| PARTIAL | Parte do caminho existe; a regra de negócio fica incompleta. |
| BROKEN | O caminho existe e produz resultado incorreto. |
| MISSING | Não há implementação da regra. |
| UNVERIFIED | Não foi executado no browser, em dispositivo ou em produção. |

Maturidade: **BÁSICA** (mínimo), **FUNCIONAL** (uso normal no código), **ROBUSTA** (falha, teste e recuperação), **AVANÇADA** (automação ou flexibilidade além do fluxo). Uma capacidade DONE pode continuar BÁSICA. Nenhuma capacidade desta auditoria chegou a ROBUSTA de ponta a ponta: o web não tem `*.spec.ts` / `*.test.ts`, e os fluxos visuais não foram executados.

Prefixo da API: `/digital-signer/v1`.

## Mapa de arquitetura encontrado

Não é proposta. É o que o repositório contém.

```
apps/api     NestJS 10, TypeORM, Postgres, Redis/Bull, S3/MinIO
apps/web     Next.js 14, next-intl (pt-br, en), porta local 3001
packages/    shared, events, database (data source), ai
```

`AppModule` (`apps/api/src/app.module.ts`) importa Config, logger, health, throttler, TypeORM (`synchronize: false`), eventos in-process, cron condicional, Bull, lock Redis, storage, PDF, AI core, tenants, auth, documents, folders, envelopes, signatures, audit, notifications, webhooks, billing, ai-fields, templates e developers.

`UsersModule` não entra no `AppModule`. É importado por auth e tenants. Não tem controller.

Guard global: `CompositeAuthGuard` (JWT ou `x-api-key`) e `TenantThrottlerGuard`. `tenantId` sai do token ou da chave, não do body. Isolamento é `where: { tenantId }` nos services. Não há RLS.

Filas Bull: `notifications`, `webhooks`, `api-request-logs`. A fila `ai-cache` é registrada; o cache efetivo é um `Map` em memória (`ai-cache.service.ts`).

Cron horário, se `ENABLE_SCHEDULER !== 'false'`: lembretes e expiração, com lock `SET NX` (`distributed-lock.service.ts`, chaves `nexosign:cron:reminders` e `nexosign:cron:expired-envelopes`).

E-mail: MailerSend em produção. Sem API key fora de produção, o driver pode ser só log. Não há SMTP direto.

PDF: `pdf-lib` desenha campos e uma página de evidências. Com certificado A1 válido, PAdES (`@signpdf`) e CAdES `.p7s` (`node-forge`). Sem certificado, o PDF final segue sem assinatura digital.

Migrations: `apps/api/src/database/migrations/` (`1730000000000` a `1730000000023`). Boot chama `runBootMigrations` depois do `listen` e não derruba o processo se a migration falhar. Saúde: `GET /health` (Postgres e Redis) e `GET /health/live` (processo). O healthcheck do `paasdeploy.json` usa `/health/live`.

Produção declarada: app `connexto-digital-signer-api`, workdir `apps/api`, host `api-signer.connexto.com.br`. Esta auditoria não consultou o ambiente.

Testes: 40 arquivos `*.spec.ts` em `apps/api`. Nenhum em `apps/web`. Sem spec de billing, ai-fields, ai-core, health e settings/certificado.

## A. Conta e organização

| Funcionalidade | Status | Maturidade | Onde | Testes | Limitação |
|---|---|---|---|---|---|
| Signup de tenant + owner | DONE | FUNCIONAL | `POST /tenants`, `tenants.service.ts`, `signup-form.tsx` | `tenants.service.spec.ts` | E-mail do owner é único no banco inteiro. Um signup, um tenant. |
| Login, refresh, logout | DONE | FUNCIONAL | `POST /auth/login`, `/refresh`, `/logout` | `auth.service.spec.ts` | `POST /auth/check-email` revela se o e-mail existe. |
| Recuperação e troca de senha | MISSING | — | Busca em `apps/api/src` sem forgot/reset/change password | NONE | — |
| Perfil do usuário | PARTIAL | BÁSICA | Menu abre `/settings` | `users.service.spec.ts` só cria owner | Settings altera a organização. Não há tela de nome, e-mail ou senha do usuário. |
| Organizações múltiplas | PARTIAL | BÁSICA | `tenants` | spec de isolamento do `findOne` | Sem switcher e sem segundo tenant para o mesmo usuário. |
| Membros e convites | MISSING | — | Enum `owner \| admin \| member` em `user.entity.ts` | NONE de convite | Só o owner é criado. |
| Permissões | MISSING | — | `role` vai no JWT | `composite-auth.guard.spec.ts` cobre autenticação, não RBAC | Nenhum controller lê `user.role`. |
| Isolamento por tenant | DONE | FUNCIONAL | `@TenantId()` a partir do guard | specs de envelopes, folders, documents, tenants | Não houve teste de penetração. |

Pasta raiz `Documentos`: evento `tenant.created` (`folders.events-handler.ts`), também em `GET /folders` e no draft sem `folderId`.

## B. Preparação de documentos

| Funcionalidade | Status | Maturidade | Onde | Testes | Limitação |
|---|---|---|---|---|---|
| Draft inicial | DONE | FUNCIONAL | `POST /envelopes/draft` | `envelopes.service.spec.ts` | Web cria o draft e troca a rota para `/documents/:id`. |
| Upload | DONE | FUNCIONAL | `POST /documents/:id/file`, S3 `tenants/{id}/documents/{id}/original.*` | `documents.service.spec.ts`, `documents.controller.spec.ts` | SHA-256 do original é gravado. |
| Validação de arquivo | PARTIAL | BÁSICA | `file-validator.ts`: PDF 5 MB, PNG/JPEG/WEBP 3 MB | `file-validator.spec.ts` | A finalização com `pdf-lib` assume PDF. Imagem pode subir e falhar depois. |
| Visualização PDF | DONE no código / UNVERIFIED na tela | BÁSICA | `features/pdf-signature/**`, `GET .../file/content` e `GET /sign/:token/pdf/content` | NONE no web | pdf.js local. |
| Campos signature e initials | DONE | FUNCIONAL | Editor em `signature-editor-modal.tsx`; API em `signature-fields.service.ts` | `signature-fields.service.spec.ts` | — |
| Campos name, date, text | PARTIAL | BÁSICA | Entidade `signature_fields`; paleta `FieldPalette.tsx` sem importador | spec da API de campos | A UI manual só oferece assinatura e rubrica. Os outros tipos entram por IA ou pela API. O signatário sabe preenchê-los. |
| Campo custom e anexo | MISSING | — | — | NONE | — |
| Associação ao signatário | DONE | FUNCIONAL | `signerId` obrigatório no campo | spec de campos | — |
| Modelos | DONE | FUNCIONAL | `/templates`, `POST /envelopes/:id/template`, `POST /templates/:id/envelopes` | `templates.service.spec.ts`, `variable-resolver.spec.ts` | `category` é string livre. |
| Duplicar envelope | MISSING | — | — | NONE | O caminho próximo é “usar modelo”. |
| Preview do convite | DONE / visual UNVERIFIED | BÁSICA | `GET /envelopes/:id/send/preview` | `envelope-dispatch.service.spec.ts` | Preview de assunto e corpo, não do PDF carimbado. |
| Pastas | DONE | FUNCIONAL | `/folders` | `folders.service.spec.ts`, `folders.events-handler.spec.ts` | — |

Sugestão de campos por IA: `POST /documents/:id/ai/suggest-fields`. Lê até 20 páginas com `pdf-parse` e chama `gpt-4o-mini` se `AI_API_KEY` existir. Sem spec. `embed()` do gateway não tem caller de produto.

## C. Solicitação de assinatura

| Funcionalidade | Status | Maturidade | Onde | Testes | Limitação |
|---|---|---|---|---|---|
| Enviar | DONE | FUNCIONAL | `POST /envelopes/:id/send` | `envelope-dispatch.service.spec.ts` | Exige ao menos um documento e um signatário. Campos posicionados não são obrigatórios na revisão da UI (`review-step.tsx`: checklist de campos não bloqueia). |
| Signatários do envelope e contatos | DONE | FUNCIONAL | `/envelopes/:id/signers`, `/tenant-signers` | `signatures.service.spec.ts`, `tenant-signer.service.spec.ts` | Papel (testemunha, aprovador, parte) é rótulo. Não muda quem precisa assinar. |
| Paralelo | DONE | FUNCIONAL | `SigningMode.PARALLEL` notifica todos | spec de dispatch | — |
| Sequencial no envio | DONE | FUNCIONAL | Valida `order` e notifica o primeiro; o próximo sai no aceite | spec de dispatch | Ver lembretes em F. |
| Link | DONE | FUNCIONAL | Token hex, URL `{WEB_BASE_URL}/{locale}/sign/{token}` | template `signature-invite.spec.ts` | Entrega real depende do MailerSend. |
| OTP do signatário | PARTIAL | BÁSICA | `POST /sign/:token/send-code` e `/verify-code` | `signing-flow.service.spec.ts` recusa aceite sem verificação quando o método é e-mail | Sem SMS. `authMethod` diferente de `email` não exige `verifiedAt`. |
| Identidade | PARTIAL | BÁSICA | `POST /sign/:token/identify`; CPF validado no formato | indireto | Não consulta bureau. |
| Expiração | BROKEN | BÁSICA | `reminder-scheduler.service.ts` `processExpiredEnvelope` | spec do cron | Se ninguém assinou, vira `expired`. Se alguém assinou, vira `completed` sem PDF, sem hash final e sem evento `document.expired`. `DocumentsService.markExpired` emite o evento, mas ninguém fora do spec a chama. |
| Cancelar rascunho | DONE | BÁSICA | `DELETE /envelopes/:id` se status `draft` | `envelopes.service.spec.ts` | — |
| Cancelar enviado | MISSING | — | — | NONE | — |
| Reenviar convite | MISSING | — | — | NONE | “Reenviar” na tela pública é novo OTP, não novo convite. |
| Recusar | MISSING | — | `SignerStatus` é `pending` ou `signed` | NONE | — |
| Concluir quando todos assinam | DONE | FUNCIONAL | `finalizeEnvelope`: embed, evidência, hash, PAdES/P7S opcional | `envelope-dispatch.service.spec.ts`, `pdf.service.spec.ts`, `cades-signer.spec.ts` | Falha de certificado é logada; o PDF segue sem `.p7s`. |
| Fechamento manual | PARTIAL | BÁSICA | Coluna `closureMode`; `DocumentsService.closeDocument` | nenhum caller de produção | Sem rota. Marca `completed` e emite evento sem gerar PDF. |

## D. Experiência de assinatura

Página `apps/web/src/app/[locale]/sign/[token]/page.tsx`. Passos no código: identify (se pedido), view, fill, validate (se `authMethod=email`), review, depois `/success`.

| Funcionalidade | Status | Maturidade | Evidência |
|---|---|---|---|
| Fluxo público sem conta | DONE no código / UNVERIFIED na tela | BÁSICA | Cliente axios sem cookie em `features/signing/api.ts`. |
| Desktop e mobile | PARTIAL / UNVERIFIED | BÁSICA | Classes `sm:`/`md:`, `100dvh`, `touch-action: none` no canvas. Sem execução em aparelho. |
| Preenchimento e desenho | DONE no código | BÁSICA | `signature-modal.tsx`. Uma rubrica replica nos campos `signature`. |
| Anexos do signatário | MISSING | — | — |
| Geolocalização | PARTIAL | BÁSICA | Enviada no accept se o browser permitir; falha é ignorada. Migration `1730000000018`. |
| Retomada | PARTIAL | BÁSICA | O token continua válido. O passo atual é estado React: recarregar volta ao início do fluxo. Quem já assinou vê estado `signed`. |
| Acessibilidade | PARTIAL / UNVERIFIED | BÁSICA | `aria-*` pontual. Sem teste de teclado ou leitor de tela. |
| Expirado na página pública | PARTIAL | BÁSICA | Chaves `signer.expired` e `signer.completed` existem no JSON e não são usadas na página. Token inválido e envelope expirado caem no mesmo erro genérico, salvo se o signatário já estiver `signed`. |

## E. Acompanhamento

| Funcionalidade | Status | Maturidade | Onde | Limitação |
|---|---|---|---|---|
| KPIs | PARTIAL | BÁSICA | `overview/page.tsx`, `GET /envelopes/stats` | O link do KPI usa `?status=`, e a lista só lê `track` e `search`. |
| Lista por status | DONE | FUNCIONAL | `documents/page.tsx`, `GET /envelopes?status=` | Sem estado de erro da query. |
| Tracking por signatário | DONE | FUNCIONAL | `GET /envelopes/:id/tracking`, `signer-tracking-panel.tsx` | `viewedAt` aparece aqui. A timeline do summary não inclui “aberto”. Datas do painel usam locale fixo `pt-BR`. |
| Timeline e histórico | PARTIAL | FUNCIONAL | `GET /envelopes/:id/summary`, `GET /audit/history` | Feed do dashboard usa `createdAt`, não o evento real. Sino in-app é lista vazia com indicador sempre visível (`app-shell.tsx`). |
| Atraso | MISSING | — | — | Não há aging, SLA nem ordenação por espera. |
| Busca | DONE por título / PARTIAL como busca de contratos | BÁSICA | `GET /envelopes?search=`, header `sm+` | Não busca conteúdo do PDF. Header some abaixo de `sm`. |
| “Assinar documentos” | DONE | BÁSICA | `GET /signers/search-documents` | Mínimo de 3 caracteres. É pendência do signatário, não arquivo concluído. |

## F. Automação e confiabilidade

| Funcionalidade | Status | Maturidade | Evidência |
|---|---|---|---|
| Lembrete 1, 2, 3 ou 7 dias, máximo 3, ou nenhum | PARTIAL | BÁSICA | `reminder-scheduler.service.ts`, `reminder-scheduler.service.spec.ts` | Intervalo não é livre. |
| Lembrete sequencial | BROKEN | — | `processEnvelopeReminders` busca todo `pending`. `lastNotified = notifiedAt ?? 0`, então quem ainda não foi convidado passa no intervalo no primeiro cron. O claim grava `notifiedAt` e não desfaz se o e-mail falhar depois. |
| Lock Redis do cron | DONE | FUNCIONAL | `distributed-lock.service.spec.ts` | Se o lock falha, o cron registra e sai. Sem teste de duas instâncias. |
| Fila de e-mail | DONE | FUNCIONAL | `EmailProcessor`, 3 tentativas, backoff 1s | `email.processor.spec.ts` |
| Fila de webhook | DONE | FUNCIONAL | `WebhookProcessor` + `POST /webhooks/deliveries/:id/retry` | `webhooks.service.spec.ts` |
| Idempotência do lembrete | PARTIAL | BÁSICA | `UPDATE` condicional em `reminderCount` | Perda do lembrete se o envio falha após o claim. |
| Idempotência de `POST /send` e de webhook | MISSING | — | Sem chave de idempotência. |
| Reprocessar PDF | MISSING | — | — |
| Métricas de produto | PARTIAL | BÁSICA | Health e log de request | Sem fila morta na UI e sem alerta. |

## G. Documento concluído

| Funcionalidade | Status | Maturidade | Evidência |
|---|---|---|---|
| PDF final no aceite do último signatário | DONE | FUNCIONAL | `pdf.service.ts`, dispatch | Não roda na expiração parcial nem em `closeDocument`. |
| Armazenamento original, final e `.p7s` | DONE | FUNCIONAL | `s3-storage.service.ts` | `s3-storage.service.spec.ts` |
| Download autenticado e pelo token | DONE | FUNCIONAL | `documents.controller.ts`, `SignController` | 404 de arquivo assinado é engolido na UI de success/summary. |
| Compartilhar link público do concluído | MISSING | — | O token de assinatura continua sendo a via do signatário. |
| Página de evidências e hashes | DONE | FUNCIONAL | `appendEvidencePage`, summary | Fuso da página fixo em `GMT -03:00`; o summary fala em UTC. |
| Certificado A1 | DONE | FUNCIONAL | `POST/GET/DELETE /settings/certificate` | Sem spec do upload. Sem certificado, não há PAdES. |
| Versões | MISSING | — | `documents.version` default 1, sem incremento. |
| Revalidar hash sob demanda | MISSING | — | Hashes são exibidos, não recalculados por um endpoint de verificação. |

## H. Gestão pós-assinatura

| Funcionalidade | Status |
|---|---|
| Repositório além de envelope + pasta | MISSING |
| Categorias de contrato | MISSING no documento. PARTIAL: string `templates.category`. |
| Tags, metadados livres, obrigações, vigência, renovação | MISSING. `expiresAt` é prazo para assinar. |
| Busca por conteúdo | MISSING. Texto do PDF só alimenta sugestão de campos. |
| Busca de concluídos por signatário | PARTIAL. Há lista de signatários e busca de pendências. |
| Rastreio do evento | PARTIAL. `audit_logs` + summary. |

## I. Integrações

| Funcionalidade | Status | Maturidade | Evidência |
|---|---|---|---|
| OpenAPI / Scalar | PARTIAL | BÁSICA | Ligado só com `API_DOCS_ENABLED=true` (`openapi.config.ts`). A tela `/developers/docs` embute iframe. |
| Chaves de desenvolvedor | DONE para gestão / PARTIAL para uso | BÁSICA | `POST /developers/api-keys`, teto de 10. `hasScope` não é chamado. |
| Chave legada do tenant | PARTIAL | BÁSICA | `/settings/api-key` e fallback no guard. Segunda noção de chave, ao lado das chaves de developer. |
| Criar e enviar envelope via API key | MISSING | — | `@RequireAuthMethod('jwt')` em envelopes, documents, folders, signers, billing, audit, settings, ai-fields. |
| Templates e webhooks via API key | DONE | FUNCIONAL | Esses controllers não exigem só JWT. |
| Webhooks de saída | DONE | FUNCIONAL | Eventos emitidos: `document.created`, `document.completed`, `document.expired`, `signature.signed`. |
| Catálogo de eventos | PARTIAL | BÁSICA | Exemplos do DTO citam `signer.added` e `signature.completed`, que o handler não emite. |
| Assinatura HMAC | DONE | FUNCIONAL | `X-Webhook-Signature: sha256=<hex>` |
| Retry | DONE | FUNCIONAL | Bull e retry manual. `backoffMultiplier` da entity não é lido no enqueue. |
| Idempotência do POST | MISSING | — | O consumidor precisa deduplicar. |
| Logs de request | DONE | FUNCIONAL | Fila `api-request-logs`, UI `/developers/logs`. Ignora health e docs. |
| Webhook de entrada, Stripe, WhatsApp, ERP | MISSING | — | Contato de marketing faz `preventDefault`. |

`document.expired` só sai se alguém chamar `markExpired`. O cron de expiração não chama.

## J. Administração e comercial

| Funcionalidade | Status | Evidência |
|---|---|---|
| Planos na interface | MISSING como produto. Texto estático | `pricing-section.tsx` e `pricing/page.tsx`, CTA para signup. |
| Limites | MISSING na regra | `tenants.usageLimits` pode ser gravado e não é lido fora da entity, do DTO e de fixtures. |
| Contador mensal de documentos | PARTIAL | `billing_usage` incrementa em `document.created`. `GET /billing/usage`. Sem UI e sem spec. |
| Fatura, assinatura SaaS, admin da plataforma, gestão de clientes | MISSING | — |

## Superfícies que parecem prontas e não executam a ação

- `review-step.tsx`: “Salvar rascunho” com `onClick={() => {}}`.
- `help-section.tsx`: FAQ, suporte e documentação sem navegação.
- `app-shell.tsx`: sino sem API.
- `contact/page.tsx`: formulário que não posta.
- `FieldPalette.tsx`: sem uso.
