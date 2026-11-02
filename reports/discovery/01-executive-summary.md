# 01 — Executive Summary

**Produto:** NexoSign / Connexto Digital Signer  
**Repositório:** `github.com/rafaeljfec2/connexto-digital-signer`  
**Revisão auditada:** `37c8036` (`chore: bump api and web versions for main deploy`, 2026-10-29)  
**Data da auditoria:** 2026-11-02  
**Natureza:** diagnóstico somente leitura. Nenhuma funcionalidade foi implementada. Nenhum fluxo de interface foi executado no navegador.

## O que o NexoSign possui hoje

Monólito NestJS (`apps/api`, prefixo `/digital-signer/v1`) e aplicação Next.js 14 (`apps/web`). O núcleo entregue no código é assinatura de envelopes PDF em um único tenant por conta:

1. Cadastro de organização e login com JWT e refresh.
2. Rascunho, upload, pastas e modelos.
3. Signatários em modo paralelo ou sequencial, com link público.
4. OTP por e-mail, captura de assinatura e PDF final com página de evidências.
5. Download do original, do PDF final e do `.p7s` quando há certificado A1.
6. Acompanhamento por signatário, histórico de auditoria, lembretes horários e webhooks de saída.

A visão “Assine. Acompanhe. Gerencie.” está coberta no primeiro verbo, parcial no segundo e ausente no terceiro como gestão contratual.

## O que o código sustenta de ponta a ponta

Há caminho de API e de tela, com testes de serviço no backend, para: signup, login, draft, upload de PDF, campos de assinatura e rubrica, envio, convite, aceite, finalização automática quando todos assinam, download, pastas, modelos, certificado PFX, webhooks assinados com HMAC e logs de API.

Isso é maturidade **funcional** no fluxo feliz de PDF. Não é maturidade **robusta**: a interface não tem testes, vários controles existem só como coluna, e dois caminhos de status produzem “concluído” sem o PDF final.

## O que está incompleto ou falho

| Achado | Status | Evidência |
|---|---|---|
| Senha esquecida, membros, convites e papéis aplicados | MISSING | Não há rotas de reset. `UserRole` não é lido por guard. |
| Recusa, cancelamento após envio e reenvio manual do convite | MISSING | `DELETE /envelopes/:id` só apaga rascunho (`envelopes.service.ts`). |
| Lembrete em assinatura sequencial | BROKEN | O cron lembra todo signatário `pending`. `notifiedAt` nulo vale timestamp 0 (`reminder-scheduler.service.ts`). O envio sequencial só notifica o primeiro (`envelope-dispatch.service.ts`). |
| Expiração com alguém já assinado | BROKEN | O cron marca envelope e documentos `completed` e não chama `finalizeEnvelope` nem emite `document.expired`. |
| Fechamento manual | PARTIAL | `closureMode` é gravado. `closeDocument` não tem controller e também não gera o PDF. |
| API key no fluxo de documento | PARTIAL | Envelopes, documentos, pastas e signatários exigem JWT. Templates e webhooks aceitam API key. Scopes não são aplicados. |
| Gestão pós-assinatura, planos, cobrança, anexos, versões, busca no PDF | MISSING | Entidades e telas de marketing não executam essas regras. |
| Experiência visual, mobile e produção ao vivo | UNVERIFIED | Auditoria não abriu o browser nem o ambiente de produção. |

## Dores de mercado com fonte

Amostra não estatística, lida em 2026-11-02. Cada item é um relato ou um conjunto nomeado de relatos, não um fato sobre todos os usuários da plataforma.

- **Entrega de e-mail e token:** Clicksign (ajuda oficial e Reclame Aqui) e D4Sign (Reclame Aqui, out/2026 e nov/2025).
- **Cópia assinada inacessível:** dois relatos Clicksign em out/2026 (e-mail da cópia e download desde dez/2025).
- **Falha ao concluir a assinatura:** ZapSign, fev/2026, com resposta da empresa citando atualização de estabilidade.
- **Envio pelo celular:** dois tópicos da comunidade DocuSign (ago/2024 e thread de app Android congelado).
- **Preparação confusa:** DocuSign, set/2024, campo pré-preenchido obrigatório que a usuária não via.
- **Cobrança, limite e cancelamento:** síntese e trechos do Trustpilot do DocuSign (2026). O NexoSign não cobra; também não tem plano, limite aplicado nem fatura.
- **Autenticação que trava a assinatura:** selfie com tempo esgotado na D4Sign (out/2026) e biometria de RG na Clicksign (relato com mais de 3 anos, fora do índice atual).
- **Suporte como único desbloqueio:** padrão presente nos relatos acima. No NexoSign, os botões de ajuda do dashboard não navegam e o formulário de contato não envia.

Não foi encontrada, nesta coleta, fonte primária verificável sobre anexos, webhooks ou busca de contratos especificamente na Clicksign, D4Sign ou ZapSign. Essas dores permanecem hipótese de produto, não reclamação comprovada.

## O que o NexoSign já cobre, cobre pela metade e não cobre

| Dor | Situação |
|---|---|
| Baixar o PDF assinado depois que todos assinam | Coberto no código, se a finalização automática rodar. |
| Saber quem já abriu e quem assinou | Coberto no painel de acompanhamento, não na lista. |
| Lembrar quem não assinou | Parcial e com defeito no modo sequencial. Sem botão de cobrar agora. |
| Corrigir e-mail ou cancelar depois do envio | Não coberto. |
| Assinar no celular sem dúvida | Markup responsivo existe. Uso real não verificado. |
| Achar o contrato depois | Busca por título e pastas. Sem conteúdo, tags, vigência ou renovação. |
| Integrar sem operador humano | Parcial: webhooks e chaves existem; criar e enviar envelope exige JWT. |
| Cobrança opaca de plano | Fora do produto. Os preços da página são texto estático. |

## O que precisa evoluir antes de virar diferencial

1. Confiabilidade do estado: expiração, fechamento manual e lembrete sequencial não podem marcar sucesso sem o artefato ou o destinatário correto.
2. Recuperação pelo próprio usuário: reenvio, correção, cancelamento, mensagem de erro e ajuda que funcione.
3. API utilizável por terceiro no mesmo fluxo que a tela usa.
4. Prova de que o signatário conclui no celular.

Gestão contratual, planos e automações mais ricas são oportunidades de avaliação. Não são lacunas do fluxo mínimo que o código já promete.

## Limites desta auditoria

- Código e testes lidos. Suíte não foi reexecutada nesta sessão.
- Nenhuma tela foi clicada. UX visual e mobile ficam UNVERIFIED.
- Produção (`api-signer.connexto.com.br`) não foi inspecionada.
- Pesquisa de mercado é amostra com URL, não pesquisa de satisfação.
