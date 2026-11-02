# 06 — Technical Assessment

**Revisão:** `37c8036` · **Data:** 2026-11-02  
Riscos abaixo estão no código. Não foram explorados contra produção e não incluem segredos.

## Isolamento e acesso

O `tenantId` efetivo vem do JWT ou da API key (`CompositeAuthGuard`), e os services filtram por ele. `GET/PATCH /tenants/:id` recusa outro tenant. Isso é o desenho certo para um monolito sem RLS.

Limites desse desenho:

- Não há teste de autorização cruzada em todas as rotas. O spec de tenant cobre `findOne`.
- `UserRole` (`owner`, `admin`, `member`) é persistido e copiado para o token. Nenhum guard de papel existe. Hoje só o owner é criado, então o buraco fica latente até existir membro.
- `ApiKeysService.hasScope` não é usado. Uma chave com escopo restrito ainda passa no guard onde a rota aceita API key.
- Duas credenciais de API convivem: chaves em `api_keys` e hash legado no tenant (`/settings/api-key`). O guard tenta a nova e depois a antiga.
- O fluxo que o produto vende (envelope, documento, signatário, envio) exige JWT. Uma integração com API key não opera o núcleo.
- `POST /auth/check-email` diz se o e-mail existe. É enumeração de conta.

## Links de assinatura

O acesso público é o token hex de 32 bytes na URL. Quem tem o link abre o PDF, os campos e, depois do OTP quando exigido, assina. Não há senha do signatário nem vínculo com a conta da plataforma.

`authMethod` diferente de `email` permite aceite sem `verifiedAt`. A UI oferece essa opção. É uma escolha de produto com efeito de segurança: o link sozinho basta.

Geolocalização é best-effort. IP e user-agent entram na evidência. Não há prova de identidade além do que o signatário digita (CPF validado no formato).

Não foi verificada rotação nem revogação do token depois do envio. Não há endpoint de invalidar o link sem apagar o rascunho — e rascunho enviado não pode ser apagado.

## Integridade do documento

No caminho `finalizeEnvelope` há hash do original, embed dos campos, página de evidências, hash final e, com certificado válido, PAdES e `.p7s`. Testes: `pdf.service.spec.ts`, `cades-signer.spec.ts`, `envelope-dispatch.service.spec.ts`.

Dois outros caminhos marcam concluído sem esse trabalho:

1. `processExpiredEnvelope`: se existe ao menos um signatário `signed`, envelope e documentos vão para `completed`. Não chama finalização, não grava `finalHash`, não emite `document.completed` nem `document.expired`.
2. `DocumentsService.closeDocument`: exige status pendente, grava `completed`, emite `document.completed`. Não gera PDF. Não tem controller. `closureMode=manual` é só coluna (`envelope.entity.ts`, settings).

Quem olhar o status vê “concluído” e o download do assinado responde 404. A UI engole esse 404.

`markExpired` emite o evento certo e só é chamada no spec.

Fuso da página de evidências está fixo em horário de Brasília; o summary expõe UTC. O hash é armazenado, sem endpoint para recomputar contra o objeto no bucket.

Imagens passam no `file-validator` e o carimbo usa `pdf-lib`. Esse descompasso pode quebrar a finalização. Não foi executado um upload de PNG nesta auditoria: o risco é leitura de código.

## Concorrência, retry e cron

O que está sólido no código:

- Claim do lembrete com `UPDATE` condicional em `reminderCount` e teste de corrida no spec.
- Lock Redis `SET NX` e release com compare-and-del.
- Bull com 3 tentativas em e-mail e webhook.
- Retry manual de delivery.
- Boot de migration que não mata o processo.

O que não está sólido:

- Lembrete sequencial não filtra a vez. `notifiedAt` nulo vira `0`, o intervalo já “passou”, o claim grava `notifiedAt` e o signatário futuro recebe e-mail cedo. Se o provider falha depois do claim, o contador não volta: aquele lembrete se perde.
- `POST /send` e o POST do webhook não têm chave de idempotência. Retry de webhook repete o evento. O consumidor precisa deduplicar. Não há header de id de evento além da assinatura e do tipo.
- `backoffMultiplier` da config de webhook não entra no enqueue.
- Cache de IA é memória local. A fila `ai-cache` não guarda valor. Duas instâncias não compartilham sugestão nem limite de chamada.
- `cleanupExpiredTokens` de refresh não tem cron caller.
- Health de produção usa liveness, que não olha Postgres nem Redis. Readiness existe e não é o probe do `paasdeploy.json`.
- Não há teste de duas instâncias. O lock torna o cron seguro apenas se todas as instâncias apontarem para o mesmo Redis e a flag `ENABLE_SCHEDULER` estiver coerente.

## Observabilidade

Há log de request em fila, health e logs de cron. Não há métrica de produto, fila morta na interface, nem status de entrega de e-mail. O remetente não distingue “enfileirado”, “aceito pelo MailerSend” e “aberto”.

`viewedAt` existe (migration `1730000000015`) e aparece no tracking. A timeline do summary não mostra a abertura.

## Testes

40 specs no backend, concentrados em dispatch, signing flow, campos, documentos, PDF, CAdES, webhooks, chaves, cron, lock e auth. Não há spec de:

- `ai-fields` / `ai-core`
- billing e enforcement de limite
- upload e uso do certificado
- `markExpired` ligado ao cron (o método tem spec; o cron não o usa)
- lembrete com `signingMode=sequential` e `notifiedAt=null`
- qualquer componente web

Por isso o fluxo feliz de assinatura é FUNCIONAL no backend testado, e a experiência continua UNVERIFIED. Nenhum módulo desta auditoria é ROBUSTO no sentido “falha tratada, teste e operação”.

## Efeito na experiência

| Risco técnico | O que a pessoa vê |
|---|---|
| Expiração parcial vira concluído | Documento “pronto” sem arquivo assinado. |
| Fechamento manual sem PDF | O mesmo, se algum dia a rota for ligada do jeito que o método está. |
| Lembrete sequencial | E-mail para quem ainda não deve assinar; o contador de 3 se gasta. |
| Claim sem rollback | Menos lembretes do que o intervalo promete, sem aviso. |
| Sem reenvio e sem status de e-mail | O mesmo buraco que Clicksign e D4Sign empurram para o suporte. |
| 404 silencioso | Botão de download que não explica a ausência do arquivo. |
| Ajuda e contato inertes | Nenhum caminho de produto quando o item acima acontece. |
| API key fora do núcleo | Integração não automatiza o envio que a tela faz. |
| Sem recuperação de senha | Conta inacessível sem intervenção. |

## O que não foi verificado

Produção FlowDeploy, conteúdo do bucket, entregabilidade MailerSend, comportamento do certificado real, carga, RLS ausente sob SQL direto, e qualquer exploit. Este documento não é pentest.
