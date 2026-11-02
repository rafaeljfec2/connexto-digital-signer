# 07 — Opportunity Backlog

**Data:** 2026-11-02 · **Revisão:** `37c8036`

Lista sem ordem, sem estimativa e sem compromisso de construção. Cada item existe porque a auditoria mostrou um gap interno, uma dor externa com fonte, ou os dois. Itens marcados como hipótese não devem virar requisito só por estar aqui.

O responsável pelo produto ainda precisa decidir o que manter, corrigir, melhorar, criar ou não construir.

## Confiabilidade do que já existe

1. **Expiração não pode concluir sem PDF.** Hoje, uma assinatura parcial no prazo vencido grava `completed` e não finaliza (`reminder-scheduler.service.ts`). A pessoa vê sucesso e não baixa o arquivo. Dor externa próxima: ZapSign, finalização, 2 fev 2026; Clicksign, download, out/2026.
2. **Fechamento manual coerente ou ausente da UI.** `closureMode` é configurável e `closeDocument` conclui sem artefato e sem rota. Ou o modo passa a finalizar de verdade, ou a tela deixa de oferecê-lo.
3. **Lembrete só para quem já foi convidado e está na vez.** O cron ignora o modo sequencial e trata `notifiedAt` vazio como data zero.
4. **Não consumir o lembrete se o e-mail não saiu.** O claim incrementa antes do envio e não reverte.
5. **Evento `document.expired` no caminho real.** `markExpired` emite; o cron não chama. Webhook e auditoria ficam cegos.
6. **Erro visível quando o PDF assinado não existe.** A UI de sucesso e de resumo engole 404.
7. **Prova de entrega do convite.** Mercado: ajuda da Clicksign e reclamações D4Sign/Clicksign de token que não chega. O NexoSign enfileira e não mostra entregue, recusado ou aberto no nível do provedor.
8. **Reenvio manual do convite.** Não há endpoint. O “reenviar” público é só OTP.

## Autonomia de quem envia e de quem assina

9. **Recuperação de senha.** MISSING. Relatos externos de conta bloqueada (D4Sign, DocuSign) mostram o custo de não entrar.
10. **Corrigir depois do envio:** e-mail do signatário, cancelar, recusar. Hoje o menu do pendente não faz isso, e apagar só vale para rascunho.
11. **Mensagem de expirado distinta de token inválido** na página pública. As chaves i18n já existem e não são usadas.
12. **Ajuda que navega e contato que envia.** Os controles atuais não executam ação. Padrão externo: suporte como único desbloqueio.
13. **Filtro de status vindo do dashboard.** O KPI monta `?status=` e a lista ignora.
14. **Quem está pendente sem abrir um diálogo**, incluindo prazo. O painel já recebe `expiresAt` e não mostra.

## Preparação e assinatura

15. **Campos de nome, data e texto no editor**, ou remoção da expectativa. A API e o signatário já suportam; a paleta não está ligada. Relato DocuSign de campo obrigatório invisível recomenda mostrar o que falta, não esconder.
16. **Bloqueio ou confirmação explícita** ao enviar sem nenhum campo, se essa for a regra desejada. Hoje a revisão só avisa.
17. **“Salvar rascunho”** que salve ou que saia da tela. O botão está vazio; o draft já foi criado na entrada.
18. **Imagem como documento de verdade ou recusa no upload.** O validador aceita PNG/JPEG/WEBP; a finalização assume PDF.
19. **Verificação mobile do fluxo público.** Única forma de sair de UNVERIFIED. Evidência externa de falha no celular é da DocuSign, não uma medição do NexoSign.
20. **Retomar o passo** depois de recarregar. O token sobrevive; o stepper React não.

## Integração

21. **API key no mesmo fluxo da UI** (draft, upload, signatário, envio, download), com scope de fato aplicado. Hoje o núcleo exige JWT e `hasScope` não é chamado.
22. **Uma noção de chave.** Developer keys e chave legada do tenant coexistem.
23. **Catálogo de eventos igual ao que o handler emite.** O exemplo cita `signer.added` e `signature.completed`; o handler emite outros nomes.
24. **Idempotência do webhook** (id estável do evento). Retry hoje pode repetir o POST. `backoffMultiplier` está na entity e não no enqueue.
25. **Documentação ligada em produção** só se `API_DOCS_ENABLED` for decisão explícita. A tela de developers depende desse iframe.

## Gestão e comercial

26. **Busca que encontre contrato**, não só título do envelope. Sem reclamação primária nesta coleta: hipótese alinhada à visão “Gerencie”.
27. **Vigência, renovação e obrigação.** `expiresAt` hoje é prazo para assinar. Hipótese, sem fonte externa nesta pasta.
28. **Anexos.** Hipótese. Não há reclamação primária coletada nem modelo interno.
29. **Planos, limites e fatura**, se o produto for cobrar. `usageLimits` e os cards de preço não executam regra. A dor DocuSign no Trustpilot é cobrança opaca: copiar tabela de preço sem consumo visível repetiria essa dor. Também é legítimo não construir cobrança agora.
30. **Membros, papéis e convites.** O enum existe e não autoriza nada. Sem dor externa específica nesta amostra. Só vale se multi usuário for decisão de produto.
31. **Versões de documento.** Coluna `version` default 1. Sem evidência de demanda nesta pesquisa.

## Explicitamente fora deste discovery

Não há recomendação de qual item fazer primeiro. Não há desenho de arquitetura nova. Itens 26–28 e 31 permanecem hipótese até haver pesquisa própria com usuário do NexoSign ou fonte externa verificável.
