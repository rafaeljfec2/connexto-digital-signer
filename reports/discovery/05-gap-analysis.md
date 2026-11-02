# 05 — Gap Analysis

**Revisão interna:** `37c8036` · **Fontes externas:** `04-market-pain-research.md` · **Data:** 2026-11-02

A coluna “Situação no NexoSign” usa o inventário de código. “Evidência interna” aponta arquivo, não uma execução de produção. UX visual permanece UNVERIFIED.

| Dor do usuário | Evidência de mercado | Capacidade necessária | Situação no NexoSign | Evidência interna |
|---|---|---|---|---|
| Preparação difícil ou bloqueio sem mostrar o campo | DocuSign, community, 18 set 2024, pre-fill invisível. RELATO INDIVIDUAL | Editor que mostre o que falta antes do envio | PARCIAL. O wizard avisa campos não posicionados e deixa enviar. Não há pre-fill do remetente. A paleta com nome, data e texto não é usada. | `review-step.tsx`; `FieldPalette.tsx` sem importador |
| Assinatura mobile frustrante | DocuSign community: “Sending Envelope Failed” (10 ago 2024) e app Android congelado. RECORRENTE nesses threads. Adobe: HIPÓTESE | Fluxo público que caiba e conclua no telefone | PARCIAL / UNVERIFIED. Há página pública responsiva e canvas com `touch-action`. Não houve teste em aparelho. | `sign/[token]/page.tsx`, `signature-modal.tsx` |
| Falha durante o envio, sem diagnóstico | DocuSign `ERR_CONNECTION_RESET` e upload 0% no celular | Erro acionável, rascunho que não se perde, reenvio | PARCIAL. O rascunho é criado na entrada. “Salvar rascunho” na revisão não faz nada. Falha do `POST /send` não mostra toast. Não há reenvio do convite. | `documents/new/page.tsx`; `review-step.tsx` |
| E-mail ou token não chega | Ajuda Clicksign + RA Clicksign (avaliação 9 out 2025) + RA D4Sign (6 out 2026 e 13 nov 2025). RECORRENTE | Status de entrega e alternativa ao e-mail | PARCIAL. O convite sai por fila MailerSend. Não há status “entregue/bounce” na UI. OTP pode ser reenviado; o convite, não. Fora de produção, o driver pode só logar. | `email-driver.ts`; `envelope-dispatch.service.ts`; ausência de endpoint de resend |
| Lembrete existe, mas a pessoa não controla | Clicksign documenta lembrete manual. DocuSign Trustpilot, 25 fev 2026: lembrete chega e o login não. | Lembrete automático e ação manual, sem incomodar quem já assinou ou quem ainda não é a vez | PARCIAL e BROKEN no sequencial. Intervalos fixos, máximo 3, sem botão “cobrar agora”. Cron trata `notifiedAt` nulo como epoch e lembra signatário ainda não convidado. | `reminder-scheduler.service.ts` linhas do cálculo `lastNotified` |
| Falta de acompanhamento | Inferido dos relatos em que ninguém sabe se o e-mail saiu. Não há pesquisa de dashboard. | Lista, status por pessoa, abertura e assinatura | PARCIAL. KPIs, badges e tracking (notificado, visto, verificado, assinado) existem. A lista não mostra quem segura o documento. O atalho `?status=` do KPI não filtra. Sino é vazio. | `signer-tracking-panel.tsx`; `documents/page.tsx`; `app-shell.tsx` |
| Assinatura não finaliza ou a cópia não fica disponível | ZapSign, 2 fev 2026, finalização. Clicksign, 26 e 30 out 2026, download e cópia por e-mail. | PDF final confiável e download imediato | PARCIAL. O aceite do último signatário gera PDF, evidência e download. Expiração com alguém já assinado marca `completed` sem PDF. `closeDocument` faz o mesmo e não tem rota. 404 de download é silencioso na UI. | `reminder-scheduler.service.ts` `processExpiredEnvelope`; `documents.service.ts` `closeDocument`; `success/page.tsx` |
| Autenticação impede concluir | D4Sign selfie, out/2026; token, nov/2025. Clicksign biometria antiga. | Verificação proporcional, com saída se falhar | PARCIAL. OTP por e-mail e coleta de CPF/telefone. Sem selfie. Dá para escolher `authMethod=none`. Não há mensagem específica de envelope expirado na página pública. | `validate-step.tsx`; `sign/[token]/page.tsx` |
| Cobrança manual de quem não assinou | Não há relato isolado com essa frase. O tema próximo é lembrete e perseguição por e-mail. HIPÓTESE operacional | Lembrete confiável e visível | PARCIAL. Ver linha de lembretes. | scheduler |
| Cobrança opaca do plano SaaS | Trustpilot DocuSign, síntese e trechos de 2026. AVALIAÇÃO DE PRODUTO | Plano, consumo e cancelamento explícitos | MISSING. Preços são cards estáticos. `usageLimits` não é consultado. `GET /billing/usage` não tem tela. Não há Stripe. | `pricing/page.tsx`; `tenant.entity.ts`; `billing.controller.ts` |
| Dificuldade de integração | Adobe documenta API e webhook como existentes. Não houve reclamação primária de API da Clicksign, D4Sign ou ZapSign. HIPÓTESE de gap competitivo | API da mesma operação da UI, webhook assinado, retry e doc | PARCIAL. Webhooks HMAC, retry e logs existem. Criar, enviar e baixar documento exige JWT. Scopes de API key não restringem rotas. Eventos de exemplo do DTO não batem com os emitidos. Expiração real não emite `document.expired`. | `signatures.controller.ts` `@RequireAuthMethod('jwt')`; `webhook.events-handler.ts`; `api-keys.service.ts` `hasScope` |
| Problemas com anexos | Sem fonte primária nesta coleta. HIPÓTESE | Anexo do remetente ou do signatário com validação | MISSING. Upload é o documento principal (PDF ou imagem). Não há tipo anexo. | `file-validator.ts`; nenhuma entity de attachment |
| Dificuldade de localizar contratos | Sem fonte primária. HIPÓTESE | Busca por título, pessoa, conteúdo e pasta | PARCIAL. Título, status e pastas. Busca do header some no mobile. Sem conteúdo, tag ou signatário de concluído. | `documents/page.tsx`; `folders` |
| Falta de gestão pós-assinatura | Sem fonte primária. HIPÓTESE alinhada à visão “Gerencie” | Vigência, renovação, obrigação, metadados | MISSING. `expiresAt` é prazo de assinatura, não vigência. | `envelope.entity.ts`; domínio H do inventário |
| Suporte como único jeito de resolver | Padrão dos RA Clicksign, D4Sign e ZapSign citados. RECORRENTE nos relatos lidos | Ajuda, erro claro, reenvio, correção e download | NÃO RESOLVE. Botões de ajuda não navegam. Contato não envia. Não há cancelar/reenviar depois do envio. | `help-section.tsx`; `contact/page.tsx` |
| Acesso à conta bloqueia a operação | D4Sign após troca de plano; DocuSign após disputa de pagamento e o relato de login de fev/2026 | Entrar, recuperar senha, não perder documentos | PARCIAL. Login e refresh existem. Não há senha esquecida. Não há 2FA de usuário. Não há admin para desbloquear. | `auth.controller.ts` sem rota de reset |

## Leitura do cruzamento

**Já resolve, no código do fluxo feliz:** criar conta, enviar PDF, acompanhar cada signatário dentro de um painel, baixar o PDF quando todos assinam, guardar hash e, com certificado, `.p7s`.

**Resolve pela metade:** lembretes, mobile, preparação de campos, API, busca, identidade do signatário, mensagens de erro.

**Resolve de forma incorreta:** lembrete no modo sequencial; expiração com assinatura parcial marcada como concluída; fechamento manual que conclui sem artefato.

**Ainda não resolve:** recuperação de senha, correção depois do envio, recusa, anexos, entrega de e-mail observável, gestão do contrato, planos e autonomia quando algo falha.

**Diferenciação possível, ainda sem evidência externa bastante:** gestão pós-assinatura e anexos. São hipóteses. A diferenciação com evidência está em confiabilidade (finalizar de verdade, mostrar entrega, deixar a pessoa corrigir sozinha) e em não repetir a opacidade de plano — o que só importa quando o NexoSign passar a cobrar.

Nada nesta matriz é ordem de implementação.
