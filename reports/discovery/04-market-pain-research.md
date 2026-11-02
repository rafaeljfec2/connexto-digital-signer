# 04 — Market Pain Research

**Coletado em:** 2026-11-02  
**Método:** páginas públicas com URL direta. Trechos abaixo foram lidos na fonte ou no JSON-LD da página. Não é amostra estatística e não descreve todos os usuários de nenhuma plataforma.

**Classificação**

- **RELATO INDIVIDUAL:** uma reclamação específica.
- **RECORRENTE:** reclamações independentes sobre o mesmo problema.
- **AVALIAÇÃO DE PRODUTO:** síntese ou conjunto de avaliações.
- **HIPÓTESE:** oportunidade sem evidência suficiente nesta coleta.

Uma reclamação não prova ausência da funcionalidade no concorrente. Várias fontes abaixo são respondidas pela empresa e marcadas como resolvidas pelo consumidor.

## DocuSign

### Envio pelo celular falha

- **Fonte:** https://community.docusign.com/esignature-111/unable-to-attach-pdf-to-send-and-unable-to-save-draft-19677
- **Data:** 10 ago 2024, com atualização da autora.
- **Trecho:** “Sending Envelope Failed / Uploading...0%”. A autora diz que, na maior parte das tentativas, não consegue enviar nem salvar rascunho pelo celular, embora o arquivo seja PDF.
- **Dor:** envio e rascunho indisponíveis no telefone, sem diagnóstico que ela consiga usar.
- **Esperado:** enviar e guardar rascunho, ou uma causa acionável.
- **Classe:** RELATO INDIVIDUAL. A resposta da DocuSign diz não ver outage do app e pede teste no browser.

### App e browser mobile inutilizáveis para uma usuária

- **Fonte:** https://community.docusign.com/integrations-extensions-176/no-joy-on-samsung-android-or-chrome-mobile-2141
- **Data:** não extraída do snippet; thread da comunidade DocuSign.
- **Trecho:** no Samsung S23 Ultra o app “freezes”; no Chrome mobile não há botão para enviar template. Outra pessoa relata o mesmo no S24 Ultra.
- **Dor:** preparação e envio no celular.
- **Esperado:** conseguir selecionar, rolar e enviar.
- **Classe:** RECORRENTE dentro desse thread (dois aparelhos), não uma taxa de mercado. A equipe sugere zoom do browser e reinstalação. Não afirma que o produto não tem app mobile.

### Criação de envelope intermitente

- **Fonte:** https://community.docusign.com/esignature-111/envelope-creation-stopped-working-for-some-of-the-users-25327
- **Data:** thread sem data única no snippet; o relato cita WAF Akamai “no início de julho” e caso de suporte aberto “há mais de 2 meses”.
- **Trecho:** “Send an Envelope” não responde e termina em `ERR_CONNECTION_RESET`. Parte dos usuários; também há dessincronia de campos vinda do Salesforce.
- **Dor:** falha de envio sem recuperação visível, com suporte longo.
- **Esperado:** criar o envelope ou ver a causa.
- **Classe:** RELATO INDIVIDUAL de uma organização, com vários usuários internos afetados.

### Campo obrigatório invisível

- **Fonte:** https://community.docusign.com/esignature-111/error-message-20534
- **Data:** 18 set 2024.
- **Trecho:** “To send, you must complete the 1 pre-fill fields with sender permissions.” A autora só conseguiu depois que alguém disse para procurar “a caixa cinza”.
- **Dor:** preparação que bloqueia o envio sem indicar o campo.
- **Esperado:** mostrar o que falta.
- **Classe:** RELATO INDIVIDUAL. A DocuSign explica que o campo pré-preenchido existe de propósito.

### Cobrança, limite e cancelamento

- **Fonte:** https://www.trustpilot.com/review/docusign.com
- **Data da leitura:** 2026-11-02. A página cita 166 avaliações. Trechos datados na própria página: 17 set 2026 (C. D. J., renovação automática sem lembrete); relato sem data única de upgrade que não aumentou envios e de cobrança adicional; cobrança de CAD 378 em 10 mar 2026 e taxa extra em 8 abr 2026, com conta que deixou de enviar.
- **Síntese da própria Trustpilot, não de um usuário:** atendimento automático, cobranças de renovação, bugs, cancelamento difícil, login e verificação para acessar documentos.
- **Dor:** o plano não é compreensível nem alterável sem suporte; falha de pagamento bloqueia o envio.
- **Esperado:** ver consumo, mudar limite e cancelar sem fila.
- **Classe:** AVALIAÇÃO DE PRODUTO para o tema cobrança/cancelamento. Cada relato continua sendo uma pessoa.

### Lembrete sem acesso à conta

- **Fonte:** https://ie.trustpilot.com/review/docusign.com
- **Data:** 25 fev 2026.
- **Trecho:** “Cant sign in and every day since I sent a document back I get a reminder e-mail. Cant contact them as you need to sign in.”
- **Dor:** notificação continua enquanto a pessoa não consegue entrar nem pedir ajuda.
- **Classe:** RELATO INDIVIDUAL.

## Adobe Acrobat Sign

Não foi aberta a ficha do Google Play nem uma avaliação individual da Adobe nesta coleta. O que existe de fonte primária aqui é documentação e ficha de loja, que descrevem capacidade, não dor.

- API e lembretes: https://developer.adobe.com/acrobat-sign/docs/overview/developer_guide/apiusage
- Webhooks: https://developer.adobe.com/acrobat-sign/docs/overview/acrobat_sign_events/ e https://helpx.adobe.com/sign/developer/webhook/overview.html
- Ficha do app (texto do fornecedor): https://apps.apple.com/us/app/adobe-acrobat-sign/id481082197 — envio, acompanhamento, lembrete, recusa e delegação aparecem como recursos anunciados.

Uma revisão de terceiro (https://signwith.co/blog/adobe-sign-review, lida em 2026-11-02) cita notas Capterra/Trustpilot e transcreve queixas de login no app e de posicionar assinatura no telefone, atribuídas ao Google Play em jul–ago/2026. **Não usei esses trechos como evidência primária**, porque a página é de um produto concorrente e os originais não foram abertos.

- **Classe:** HIPÓTESE para dores de mobile e cobrança da Adobe, até abrir a avaliação original.
- **Fato de documentação:** a Adobe descreve lembrete e webhook como recursos existentes. Uma reclamação futura não apaga isso.

## Clicksign

### E-mail ou token não chega

- **Ajuda oficial (o problema é reconhecido como classe operacional):** https://ajuda.clicksign.com/signatario-nao-recebeu-documento-e-mail-nao-entregue  
  Orienta checar “E-mails enviados”, spam, ordenação de assinatura e caixa cheia. Também: https://ajuda.clicksign.com/como-tirar-o-dom%C3%ADnio-da-clicksign-do-spam
- **Reclame Aqui:** https://www.reclameaqui.com.br/clicksign/usuario-nao-recebe-e-mail-para-assinatura-digital-de-contrato-urgente-impactando-venda-de-imovel-e-critica-falta-de-suporte-imediato-da-clicksign_CV3FXKvhb4S90joE/  
  **Data da avaliação do consumidor:** 9 out 2025. Relato: não recebeu o e-mail do token em contrato com prazo, e não achou chat ou telefone. Avaliação posterior: problema resolvido, nota 10.
- **Dor:** o remetente não distingue “não saiu” de “caiu no spam”, e o desbloqueio passa por suporte.
- **Esperado:** status de entrega e um caminho sem abrir chamado.
- **Classe:** RECORRENTE como tema (ajuda oficial + reclamação). A reclamação em si é um caso, depois resolvido.

### Cópia assinada não chega e não baixa

1. https://www.reclameaqui.com.br/clicksign/nao-recebi-copia-do-contrato-assinado-digitalmente_y3KvEwdBWO39HtEI/  
   **Publicação:** 30 out 2026. “Assinei o contrato de forma digital, não chegou por e-mail… não me enviaram a cópia do contrato.”
2. https://www.reclameaqui.com.br/clicksign/nao-consigo-baixar-documento-assinado-pela-clicksign-desde-dezembro_RWp4GTFN8-d_Hsse/  
   **Publicação:** 26 out 2026. Assinatura em 5 dez 2025; desde então não conseguiu baixar. Avaliação no mesmo dia: empresa entrou em contato e o problema foi resolvido.

A própria ajuda mostra que download existe: https://ajuda.clicksign.com/article/120-baixar-documentos-plataforma (original, assinado ou zip). Os relatos são de acesso que falhou para aquelas pessoas, não de produto sem download.

- **Dor:** depois de assinar, a pessoa não fica com o arquivo.
- **Esperado:** baixar na hora, com evidências, sem pedir à empresa.
- **Classe:** RECORRENTE na Clicksign nesta amostra (dois relatos independentes em out/2026).

### Biometria impede a assinatura

- **Fonte:** https://www.reclameaqui.com.br/clicksign/sistema-moderno-com-erro-amador_OUK7jJ6f_0e0Tfp5/
- **Data:** a página avisa que a reclamação tem mais de 3 anos e não entra mais no índice.
- **Trecho:** a captura de RG só aceitava documento vertical; o RG novo é horizontal, e a pessoa não conseguiu assinar.
- **Resposta da Clicksign:** biometria facial era beta.
- **Classe:** RELATO INDIVIDUAL, antigo. Não descreve o produto atual.

### Plano e atendimento para mudar o contrato comercial

- **Fonte:** https://www.reclameaqui.com.br/clicksign/total-descaso-com-o-consumidor_30B8oA63CDmmaJEf/
- **Trecho:** o cliente queria a cópia do contrato comercial e aumentar o plano; disse que não consegue fazer o upgrade na plataforma quando entra em plano customizado, e que o atendimento parou.
- **Classe:** RELATO INDIVIDUAL. A empresa respondeu que o caso foi tratado no WhatsApp.

Lembrete manual existe na ajuda da Clicksign (https://ajuda.clicksign.com/article/210-lembretes-automaticos): automático até 3 vezes e ação “Enviar lembretes”. Isso é capacidade anunciada, não reclamação.

## D4Sign

### Não consegue assinar e o cliente também não

- **Fonte:** https://www.reclameaqui.com.br/d4sign/nao-consigo-assinar_KuaiYPz-oTVrOcSa/
- **Publicação:** 24 jun 2024. A página marca “há mais de 1 ano”.
- **Trecho:** tenta desde 20/06, não assina e por isso o cliente não recebe o documento assinado por ela. Pede um modo em que o responsável assine antes e só depois envie ao cliente.
- **Classe:** RELATO INDIVIDUAL.

### Token não chega

- **Fonte:** https://www.reclameaqui.com.br/d4sign/nao-recebimento-de-token-para-assinatura-de-contrato-d4sign-na-xp-investimentos_vy1oTCwqxpeOwUjC/
- **Avaliação:** 13 nov 2025. “nada chega ao meu e-mail ou caixa de spam… não consigo assinar o contrato.” Avaliação: resolvido com link sem token. Comentário do consumidor: “Se a empresa sabe que o token não funciona, por quê insiste em trabalhar desta maneira?”
- **Resposta:** o token é definido também pelo remetente.
- **Classe:** RELATO INDIVIDUAL. Some ao tema recorrente de e-mail/token junto com a Clicksign e com o item abaixo.

### Reenvio não entrega

- **Fonte:** https://www.reclameaqui.com.br/d4sign/nao-recebo-e-mails-de-assinatura-da-d4sign-e-o-suporte-nao-resolveu_7GBDgB4OSdCCur1v/
- **Data do relato:** 6 out 2026 em diante; título visto em 8 out 2026 na listagem.
- **Trecho:** o suporte pediu reenvio após ajuste de e-mail; o reenvio não chegou e as mensagens seguintes ficaram sem resposta. A empresa diz que o disparo saiu e a caixa de destino não aceitou.
- **Dor:** remetente sem prova de entrega e sem próximo passo que não seja esperar o suporte.
- **Classe:** RELATO INDIVIDUAL, mesmo tema dos e-mails acima. Conjunto Clicksign + D4Sign = RECORRENTE entre plataformas, ainda assim uma minoria de casos publicados.

### Selfie com tempo esgotado

- **Fonte:** https://www.reclameaqui.com.br/d4sign/nao-consigo-assinar-contrato-com-d4sign-por-erro-na-selfie_kuAII8XtfODs46LE/
- **Data:** listada em 13 out 2026.
- **Trecho:** erro “tempo para registrar o video esgotou”; a pessoa cita paralisia facial e diz que não consegue assinar.
- **Resposta:** não acharam documento no e-mail do Reclame Aqui e pediram ao remetente para mudar o ponto de autenticação.
- **Dor:** autenticação extra bloqueia a assinatura e a correção não está na mão de quem assina.
- **Classe:** RELATO INDIVIDUAL.

### Acesso bloqueado depois de troca de plano

- **Fonte:** https://www.reclameaqui.com.br/d4sign/usuario-sem-acesso-a-conta-d4sign-apos-troca-de-plano-e-migracao-de-e-mail_dzaHNU0WTlpcIpT-/
- **Trecho:** desde 2 set (ano não isolado no corpo; contexto 2026 pela listagem) não envia nem assina. A empresa diz que normalizou no mesmo dia, em reunião.
- **Classe:** RELATO INDIVIDUAL sobre acesso, não sobre inexistência de envio.

A página institucional https://www.reclameaqui.com.br/empresa/d4sign/ (lida via busca em 2026-11-02) mostra reputação “Boa” e títulos recentes de cartão, e-mail, selfie e suporte. Títulos de listagem não foram tratados como relato completo.

## ZapSign

### Finalização não conclui

- **Fonte:** https://www.reclameaqui.com.br/zapsign/falha-na-finalizacao-de-assinaturas-e-ausencia-de-suporte-ao-cliente-na-zapsign_iun9PFUbpaZkZcdm/
- **Publicação:** 2 fev 2026. Resposta: 6 fev 2026.
- **Trecho:** “assinaturas de documentos não estavam sendo finalizadas, mesmo após diversas tentativas. Esse problema afetou diretamente três clientes meus em um unico dia.” WhatsApp de suporte negado por ser plano de menor valor. Diz ter escrito antes por e-mail sem retorno.
- **Resposta da ZapSign:** análise com engenharia, atualização de estabilidade, e fatores externos (conexão e memória do aparelho). Afirma que o serviço normalizou.
- **Dor:** o ato de assinar não produz o documento fechado, e o plano baixo não inclui o canal que resolve.
- **Classe:** RELATO INDIVIDUAL. O autor chama o problema de recorrente na própria experiência. Isso não foi confirmado com outros relatos abertos nesta coleta.

Na mesma página aparecem títulos vizinhos de nota fiscal, plano anual e cancelamento (out/2026). Não foram abertos. Ficam como índice, não como evidência de conteúdo.

## O que não foi comprovado

Busca em 2026-11-02 por anexos, webhook e “não encontro contrato” no Reclame Aqui das três plataformas brasileiras não devolveu reclamação primária sobre esses temas. Tratar “gestão pós-assinatura”, “anexo” ou “API difícil” como dor comprovada desses produtos seria hipótese.

Também não há, nesta pasta, contagem de reclamações por categoria nem comparação de reputação como argumento de produto. Reputações citadas nas páginas (Clicksign, D4Sign, ZapSign) mudam e não foram usadas para ranquear o NexoSign.

## Temas que a amostra sustenta

| Tema | Evidência | Classe |
|---|---|---|
| E-mail ou token não chega, e o remetente não vê a entrega | Ajuda Clicksign + RA Clicksign out/2025 + RA D4Sign out/2026 e nov/2025 | RECORRENTE |
| Pessoa assina e não fica com o arquivo | Dois RA Clicksign, out/2026 | RECORRENTE na Clicksign |
| Envio ou app no celular falha | Dois threads DocuSign | RECORRENTE no conjunto desses threads |
| Preparação bloqueia o envio sem mostrar o campo | Um thread DocuSign, set/2024 | RELATO INDIVIDUAL |
| Assinatura não finaliza | Um RA ZapSign, fev/2026 | RELATO INDIVIDUAL |
| Autenticação (token, selfie, biometria) impede concluir | D4Sign token e selfie; Clicksign biometria antiga | RECORRENTE como tema, casos individuais |
| Cobrança, limite e cancelamento opacos | Síntese e trechos Trustpilot DocuSign 2026 | AVALIAÇÃO DE PRODUTO |
| Suporte é o caminho para desbloquear a operação | Presente na maioria dos RA citados | RECORRENTE como padrão dos relatos lidos |
| Anexos, busca de contratos, webhooks ruins | Sem URL primária nesta coleta | HIPÓTESE |
