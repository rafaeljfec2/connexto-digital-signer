# 03 — UX Audit

**Revisão:** `37c8036` · **Data:** 2026-11-02

A interface não foi aberta, clicada nem medida em dispositivo. O que segue é rastreio de rotas, componentes, clientes HTTP e cópia i18n. Onde a conclusão depende de renderização, tempo de resposta ou toque, o status é **UNVERIFIED**.

Rotas de produto usam locale (`/pt-br` padrão, `/en`). O middleware exige cookie `auth_token` fora de login, signup, marketing, `/sign/*` e `/success`.

## 1. Quanto esforço para criar e enviar

**Fato de código.** `/documents/new` cria o rascunho sozinho (`POST /envelopes/draft`) e substitui a rota por `/documents/:id`. O wizard tem 5 etapas: documento, signatários, assinaturas, configurações, revisão.

Caminho mínimo, com título padrão e sem posicionar campos: escolher arquivo, avançar, adicionar signatário (nome e e-mail), avançar, pular posicionamento, continuar configurações, enviar. São cerca de 9 ações conscientes, mais o modal do signatário. A etapa de configurações é obrigatória mesmo quando o usuário aceita o padrão (lembrete `none`, idioma `pt-br`).

**Fricção no código**

- “Salvar rascunho” na revisão não chama API (`review-step.tsx`, `onClick={() => {}}`). O rascunho já existe desde a entrada.
- O checklist de campos posicionados avisa e não bloqueia o envio.
- Falha de `POST /send` não tem toast no trecho lido; o botão apenas deixa de carregar.
- Falha do `PATCH` de configurações também não mostra mensagem antes de avançar.
- A cópia “Preview do email” permanece em inglês no `pt-br.json`.

**UNVERIFIED:** duração percebida, clareza visual de cada etapa e se a API de envio aceita envelope sem campos (a UI permite tentar).

## 2. Preparar o documento

Upload aceita PDF, PNG, JPEG e WEBP, com teto de tamanho e bloqueio de nome duplicado na sessão. Erro de upload vira toast “Falha no envio”.

O editor manual coloca assinatura e rubrica. Nome, data e texto existem na API e na paleta não usada (`FieldPalette.tsx`). A sugestão por IA é um desvio, não o caminho mínimo, e depende de `AI_API_KEY`.

Não há duplicação de envelope. Reaproveitar passa por salvar modelo e criar outro envelope.

**UNVERIFIED:** leitura do PDF, precisão do clique no campo e comportamento de imagem na finalização.

## 3. Configurar signatários

Tudo no modal de `signers-step.tsx`. Nome e e-mail são obrigatórios. CPF, telefone, nascimento, papel e `authMethod` (`email` ou `none`) são opcionais. Contatos do tenant aparecem a partir de 2 caracteres.

O modo paralelo/sequencial fica dentro desse modal e grava na hora. A ordem sequencial é um número digitado, sem fila visual e sem arrastar. Dá para avançar a etapa com zero signatários; o bloqueio só aparece na revisão. Remover signatário não pede confirmação.

**UNVERIFIED:** o que a pessoa entende ao ver “ordem” sem uma fila, e o que a API faz com ordens duplicadas além da validação já coberta no dispatch sequencial.

## 4. O signatário consegue assinar sem dúvida

**Fato de código.** Não precisa de conta. O fluxo explica os passos por um stepper. OTP só entra se o remetente deixou autenticação por e-mail, que é o padrão do formulário. Há estados de código inválido e expirado, e reenvio do código.

**Fricção no código**

- Token inválido, erro de rede e envelope expirado compartilham o cartão genérico `signer.error`.
- As chaves `signer.expired` e `signer.completed` não são usadas na página.
- “ICP-Brasil” está fixo em inglês no JSX do estado “já assinou”.
- Se o idioma do envelope difere do locale, a página troca a URL com `location.href`. Não há evidência de que o passo React sobreviva.

**UNVERIFIED:** se as instruções bastam, se o PDF cabe no celular e se o canvas de assinatura funciona no toque. O CSS tem `100dvh`, padding mobile e `touch-action: none`. Isso não comprova a experiência.

## 5. Mobile

Não há folha separada nem app nativo. O dashboard esconde a sidebar abaixo de `lg`. A busca do header some abaixo de `sm`. O nome do signatário e o prazo ficam ocultos em breakpoints estreitos.

**UNVERIFIED** em aparelho real.

## 6. Status compreensível

Badges de rascunho, pendente, concluído e expirado existem na lista, nas pastas e nos KPIs. O status por pessoa (notificado, visualizado, verificado, assinado) só aparece no diálogo de acompanhamento e, de forma mais curta, no resumo.

O KPI aponta para `/documents?status=...`. A página de documentos ignora esse parâmetro (`documents/page.tsx` lê `track` e `search`).

Clicar um concluído abre o resumo. Clicar um pendente ou expirado reabre o wizard, que não consulta o status antes de montar.

O feed de atividade diz “enviado para assinatura” com a data de criação do envelope.

## 7. Quem está atrasando

Não há status “atrasado”, dias em espera nem nome do signatário na lista. O diálogo mostra “Aguardando...” e, se `reminderCount > 0`, quantos lembretes saíram. `expiresAt`, modo e ordem vêm no tipo `EnvelopeTracking` e o painel não os renderiza.

Não há botão “cobrar agora”.

## 8. Corrigir um erro

Antes do envio: voltar etapas, editar signatário, reiniciar o passo de upload sem apagar o arquivo, ou cancelar o rascunho com confirmação (`DELETE` só funciona em `draft`).

Depois do envio, o menu oferece acompanhar, ver resumo, baixar original e mover de pasta. Não há editar, reenviar convite, cancelar envio nem excluir. O cliente web não declara rota de resend ou void.

Como a linha pendente reabre o wizard, o botão Cancelar desse wizard chama o mesmo `DELETE`. A API recusa envelope que não é rascunho. **UNVERIFIED** se a pessoa vê uma mensagem útil ou só a falha.

## 9. Resolver sem suporte

| Superfície | Comportamento no código |
|---|---|
| Ajuda do dashboard | Botões sem `href` e sem handler (`help-section.tsx`). |
| “Ajuda” do shell | Prop declarada e não renderizada. |
| Sino | Sempre indica novidade e a lista diz que não há novidades. |
| Dica “Saiba mais” | Vai para `/documents/new`. |
| Contato | Formulário com `preventDefault`. |
| FAQ | Texto estático na página de preços. |
| `/developers/docs` | Documentação de API, não ajuda de remetente. |
| Histórico | Auditoria, não central de problemas. |

Erros com feedback: upload e cancelamento de rascunho. Sem feedback claro: envio, configurações e falha da lista.

## 10. Encontrar um documento antigo

Busca por texto na lista (debounce 400 ms) e no header, este só em `sm+`. Filtro de status na própria lista. Pastas com árvore e drag-and-drop, sem busca por nome. Ordenação só na página de 10 itens. Histórico busca eventos, não o arquivo. Empty states existem na lista, no dashboard, nas pastas e no histórico.

Não há tags, conteúdo do PDF, signatário no concluído nem vigência.

## 11. Depois da assinatura

Quem assinou cai em `/success?token=`. Pode baixar o original. O PDF assinado só habilita se `envelope.status === 'completed'`; caso contrário o botão fica desabilitado com o texto de que todos ainda precisam assinar. Falha 404 no download assinado não é anunciada. Há link para o resumo público. “Voltar para Início” vai para `/`.

O remetente tem `/documents/:id/summary` com hashes, timeline, downloads (original, assinado, `.p7s`) e “salvar como template”.

**UNVERIFIED:** se o e-mail de conclusão citado na tela sai de fato quando o MailerSend está configurado, e se o arquivo aparece no instante em que o último assina.

## i18n e marketing

Namespaces em `apps/web/src/messages/pt-br.json` e `en.json`: `common`, `auth`, `dashboard`, `documents`, `wizard`, `signers`, `fields`, `settings`, `review`, `signer`, `success`, `audit`, `signDocuments`, `tracking`, `landing`, `pricingPage`, `aboutPage`, `contactPage`, `privacyPage`, `termsPage`, `templates`, `developers`, `historico`.

Home, preços, sobre, contato, privacidade e termos leem só o next-intl. Não há fetch. O formulário de contato não posta.

## Síntese das 11 perguntas

| # | Resposta com o que dá para afirmar |
|---|---|
| 1 | Cinco etapas e cerca de nove ações no caminho mínimo. Sensação de esforço: UNVERIFIED. |
| 2 | Há títulos e contador. Há controle morto, etapa obrigatória de padrão e campos que avisam sem impedir. |
| 3 | Signup mostra a regra da senha e entra sozinho. Login tem dois passos. Não há recuperação de senha. |
| 4 | Signatários cabem no modal. A ordem sequencial é um número escondido nesse modal. |
| 5 | Há layout responsivo. Conclusão de uso no celular: UNVERIFIED. |
| 6 | Status do envelope é visível. Status da pessoa exige abrir o acompanhamento. O atalho do KPI não filtra a lista. |
| 7 | Dá para ver quem está pendente dentro do diálogo. Não dá para ver atraso na lista. |
| 8 | Antes do envio, sim. Depois do envio, não há correção guiada. |
| 9 | Não há ajuda funcional nem canal de contato ligado. |
| 10 | Título, status e pasta. Não há busca de contrato. |
| 11 | Há tela de sucesso, download condicionado e resumo. O que fazer com o contrato depois disso não existe como produto. |
