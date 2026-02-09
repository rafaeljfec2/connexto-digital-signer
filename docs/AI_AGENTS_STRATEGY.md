# Estudo Estratégico: Agentes de IA no Connexto Digital Signer

## Contexto do Produto

O Connexto Digital Signer é uma plataforma SaaS de assinatura eletrônica multi-tenant com:

- Fluxo de criação de documentos em wizard (Upload, Signatários, Campos, Configurações, Revisão)
- Fluxo de assinatura pública em 4 etapas (Visualizar, Preencher, Validar, Revisar)
- Trilha de auditoria completa, webhooks, lembretes automáticos, multi-idioma
- Conformidade com MP 2.200-2/2001 e Lei 14.063/2020

---

## 1. Smart Field Placement Agent (Posicionamento Inteligente de Campos)

**Dor que resolve:** Hoje o usuário precisa manualmente arrastar e posicionar cada campo de assinatura no PDF. Em documentos longos com múltiplos signatários, isso é tedioso e propenso a erros.

**Como funciona:**

- O usuário faz upload do PDF
- O agente analisa o conteúdo do documento usando OCR + LLM
- Detecta automaticamente áreas de assinatura (linhas "___________", textos como "Assinatura:", "Witness:", blocos de assinatura)
- Sugere posicionamento de campos (signature, name, date, initials) com coordenadas normalizadas
- O usuário revisa e ajusta as sugestões com um clique

**Impacto no produto:**

- Reduz tempo de preparação de documento de minutos para segundos
- Diferencial competitivo direto contra DocuSign/Clicksign
- Melhora onboarding de novos usuários (menos curva de aprendizado)

**Integração técnica:**

- Novo endpoint `POST /documents/:id/ai/suggest-fields`
- Usa o PDF já armazenado no S3 (`originalFileKey`)
- Retorna array de `SignatureField` sugeridos com coordenadas
- Frontend exibe sugestões como campos "fantasma" que o usuário confirma

**Complexidade:** Média | **Impacto:** Alto | **Prioridade:** 1

---

## 2. Document Summary Agent (Resumo Inteligente para Signatários)

**Dor que resolve:** Signatários recebem PDFs longos e complexos. Muitos não leem o documento inteiro antes de assinar, ou demoram porque precisam ler tudo.

**Como funciona:**

- Quando o signatário abre o link de assinatura (`/sign/:token`)
- O agente gera um resumo estruturado do documento:
  - Tipo de documento (NDA, contrato de serviço, SOW, etc.)
  - Partes envolvidas
  - Obrigações principais
  - Prazos e valores relevantes
  - Cláusulas de rescisão/penalidade
- Exibido como card colapsável no View Step, antes do signatário preencher campos

**Impacto no produto:**

- Aumenta taxa de conclusão de assinatura (menos abandono)
- Reduz tempo médio de assinatura
- Diferencial UX único no mercado brasileiro
- Agrega valor de confiança (signatário entende o que está assinando)

**Integração técnica:**

- Novo endpoint `GET /sign/:token/ai/summary`
- Cache do resumo no banco (campo `aiSummary` JSONB na tabela `documents`)
- Gerado on-demand na primeira visualização, cached depois
- Frontend: novo componente no `view-step.tsx`

**Complexidade:** Baixa | **Impacto:** Alto | **Prioridade:** 1

---

## 3. Intelligent Reminder Agent (Lembretes Inteligentes)

**Dor que resolve:** O sistema atual envia lembretes em intervalos fixos (1, 2, 3 ou 7 dias). Não considera comportamento do signatário, horário ótimo de envio, nem tom da mensagem.

**Como funciona:**

- Analisa padrões históricos de assinatura por tenant:
  - Horários com maior taxa de abertura/assinatura
  - Número ideal de lembretes antes de assinar
  - Signatários que nunca abrem vs. que abrem mas não assinam
- Personaliza o tom do lembrete:
  - 1º lembrete: neutro e informativo
  - 2º lembrete: urgência leve + menciona prazo
  - 3º lembrete: urgência alta + consequências
- Otimiza horário de envio por signatário

**Impacto no produto:**

- Aumento de 15-30% na taxa de conclusão (benchmark do mercado)
- Redução de documentos expirados
- Menos fricção com signatários (não recebem email em horário inconveniente)

**Integração técnica:**

- Evolução do `ReminderSchedulerService` existente
- Nova tabela `signer_engagement` para tracking de abertura
- Pixel de tracking em emails ou webhook de abertura
- LLM gera copy personalizada do lembrete baseada no contexto

**Complexidade:** Média | **Impacto:** Alto | **Prioridade:** 2

---

## 4. Document Classification & Template Agent (Classificação e Templates)

**Dor que resolve:** Usuários enviam os mesmos tipos de documento repetidamente (NDAs, contratos, aditivos). Cada vez precisam configurar tudo do zero.

**Como funciona:**

- Ao fazer upload, o agente classifica automaticamente o tipo de documento
- Sugere um template de configuração (signatários, campos, settings) baseado em documentos anteriores similares
- Aprende com os documentos do tenant para sugerir templates cada vez mais precisos
- Permite salvar configurações como template reutilizável

**Impacto no produto:**

- Reduz drasticamente tempo de preparação para documentos recorrentes
- Feature de "templates inteligentes" é muito vendável para equipes jurídicas
- Aumenta retenção (quanto mais templates, mais difícil migrar)

**Integração técnica:**

- Nova entidade `DocumentTemplate` com campos, signatários e settings pré-definidos
- Endpoint `POST /documents/:id/ai/classify`
- Endpoint `GET /tenants/:id/templates/suggestions`
- Embeddings dos documentos para similarity search

**Complexidade:** Média | **Impacto:** Alto | **Prioridade:** 2

---

## 5. Compliance Checker Agent (Verificação de Conformidade)

**Dor que resolve:** Empresas precisam garantir que documentos estão em conformidade com requisitos legais antes de enviar para assinatura.

**Como funciona:**

- Analisa o documento contra checklist de conformidade:
  - Identificação completa das partes (CPF/CNPJ, endereços)
  - Cláusulas obrigatórias (foro, lei aplicável, rescisão)
  - Linguagem ambígua ou problemática
  - Valores sem extenso
  - Datas inconsistentes
- Retorna score de conformidade + lista de alertas

**Impacto no produto:**

- Posiciona o produto como mais que assinatura: "compliance-first"
- Reduz risco jurídico dos clientes
- Upsell para plano premium
- Diferencial forte no mercado brasileiro (regulação complexa)

**Integração técnica:**

- Endpoint `POST /documents/:id/ai/compliance-check`
- Resultado exibido no wizard antes do envio (Review step)
- Alertas como warnings (não bloqueantes) com sugestões de correção

**Complexidade:** Média-Alta | **Impacto:** Alto | **Prioridade:** 3

---

## 6. Signing Assistant Chatbot (Assistente do Signatário)

**Dor que resolve:** Signatários, especialmente menos técnicos, abandonam o fluxo de assinatura por não entenderem o processo ou terem dúvidas sobre o documento.

**Como funciona:**

- Widget de chat flutuante na página de assinatura (`/sign/:token`)
- Responde perguntas sobre:
  - O processo de assinatura ("É seguro?", "Tem validade jurídica?")
  - O documento ("O que diz a cláusula 5?", "Qual o prazo?")
  - Problemas técnicos ("Não consigo desenhar minha assinatura")
- Contexto: tem acesso ao conteúdo do documento + FAQ do produto

**Impacto no produto:**

- Reduz abandono no fluxo de assinatura
- Reduz tickets de suporte
- Experiência premium que gera confiança

**Integração técnica:**

- Componente React `<SigningAssistant />` no layout de `/sign/:token`
- Endpoint `POST /sign/:token/ai/chat` (stateless, context por request)
- Contexto: conteúdo do PDF + FAQ embeddings

**Complexidade:** Média | **Impacto:** Médio | **Prioridade:** 3

---

## 7. Fraud Detection Agent (Detecção de Anomalias)

**Dor que resolve:** Assinaturas fraudulentas ou comportamento suspeito podem comprometer a validade jurídica dos documentos.

**Como funciona:**

- Analisa padrões de comportamento durante a assinatura:
  - Tempo muito curto entre abertura e assinatura (não leu o documento)
  - IP de país diferente do esperado
  - Múltiplas assinaturas do mesmo IP em curto período
  - User-Agent inconsistente
  - Assinatura (imagem) muito diferente de assinaturas anteriores do mesmo email
- Gera score de risco por assinatura
- Alerta o dono do documento em casos suspeitos

**Impacto no produto:**

- Agrega camada de segurança única
- Fortalece a validade jurídica das assinaturas
- Diferencial para clientes enterprise e financeiros

**Integração técnica:**

- Novo campo `riskScore` na entidade `Signer`
- Processamento assíncrono via fila Bull após `signature.completed`
- Dashboard de risco para o dono do documento
- Webhook event `signature.risk_detected`

**Complexidade:** Alta | **Impacto:** Alto | **Prioridade:** 4

---

## 8. Natural Language Document Generation (Geração de Documentos)

**Dor que resolve:** Muitas empresas não têm modelo de contrato pronto e perdem tempo criando documentos do zero.

**Como funciona:**

- Usuário descreve em linguagem natural o que precisa: "Preciso de um NDA entre minha empresa e um fornecedor, vigência de 2 anos, multa de R$ 50.000"
- O agente gera um PDF profissional com todas as cláusulas relevantes
- Usuário revisa, edita se necessário, e envia para assinatura no mesmo fluxo

**Impacto no produto:**

- Transforma o produto de "ferramenta de assinatura" para "plataforma de contratos"
- Aumenta significativamente o TAM (Total Addressable Market)
- Feature "wow" que gera viralidade

**Integração técnica:**

- Novo fluxo no wizard: "Criar documento com IA" vs "Upload PDF"
- Endpoint `POST /documents/ai/generate`
- Usa templates legais como base + personalização via LLM
- Gera PDF com pdf-lib

**Complexidade:** Alta | **Impacto:** Muito Alto | **Prioridade:** 4

---

## 9. Analytics & Insights Agent (Inteligência de Dados)

**Dor que resolve:** Donos de conta não têm visibilidade sobre eficiência do processo de assinatura.

**Como funciona:**

- Dashboard com insights gerados por IA:
  - "Seus documentos levam em média 3.2 dias para serem assinados. 40% mais lento que a média da plataforma"
  - "João Silva tem 5 documentos pendentes há mais de 7 dias"
  - "Seus NDAs têm taxa de conclusão de 85%, mas contratos de serviço apenas 60%"
  - "Sugestão: ativar lembretes a cada 2 dias pode reduzir seu tempo médio em 30%"
- Relatórios periódicos por email

**Integração técnica:**

- Queries agregadas sobre `documents`, `signers`, `audit_logs`
- Endpoint `GET /tenants/:id/ai/insights`
- Componente de dashboard com cards de insights
- Email semanal com resumo

**Complexidade:** Média | **Impacto:** Médio | **Prioridade:** 5

---

## Mapa de Prioridades

### Prioridade 1 - Quick Wins de Alto Impacto
- **Smart Field Placement** - Posicionamento automático de campos via IA
- **Document Summary** - Resumo inteligente do documento para signatários

### Prioridade 2 - Diferenciação Competitiva
- **Intelligent Reminders** - Lembretes personalizados com timing otimizado
- **Classification & Templates** - Classificação automática e templates inteligentes

### Prioridade 3 - Valor Agregado
- **Compliance Checker** - Verificação de conformidade legal
- **Signing Chatbot** - Assistente de chat para signatários

### Prioridade 4 - Visão de Futuro
- **Fraud Detection** - Detecção de anomalias e scoring de risco
- **Document Generation** - Geração de contratos via linguagem natural
- **Analytics & Insights** - Inteligência de dados e relatórios

### Dependências entre features

```
Smart Field Placement ──> Intelligent Reminders ──> Fraud Detection
Document Summary ──────> Signing Chatbot ─────────> Analytics & Insights
                         Classification & Templates ──> Document Generation
                         Compliance Checker ──────────> Fraud Detection
```

---

## Arquitetura Técnica Sugerida

Para implementar agentes de IA de forma escalável e desacoplada:

```
┌──────────────────┐    ┌──────────────────────────────────────────┐
│  Frontend        │    │  API NestJS                              │
│  Next.js         │───>│  AI Controller ──> AI Service ──> Queue  │
│  UI Components   │    │                                          │
└──────────────────┘    └──────────────┬───────────────────────────┘
                                       │
                        ┌──────────────▼───────────────────────────┐
                        │  AI Layer                                │
                        │  AI Gateway Service ──> OpenAI API       │
                        │  Redis Cache                             │
                        │  Vector Store (pgvector)                 │
                        └──────────────┬───────────────────────────┘
                                       │
                        ┌──────────────▼───────────────────────────┐
                        │  Storage                                 │
                        │  S3 (PDFs) + PostgreSQL                  │
                        └──────────────────────────────────────────┘
```

**Decisões arquiteturais chave:**

- **AI Gateway Service:** Camada de abstração sobre o provider de LLM (OpenAI, Anthropic, etc.), permitindo trocar sem impacto no código
- **Bull Queue:** Tarefas de IA são assíncronas por natureza. Usar fila evita timeout e permite retry
- **Redis Cache:** Resumos e classificações são cacheados para evitar custo desnecessário de API
- **pgvector:** Para similarity search de documentos/templates, usar extensão pgvector do PostgreSQL (já utilizado no projeto)
- **Custo por tenant:** Tracking de tokens consumidos por tenant para billing de features AI

---

## Monetização Sugerida

- **Plano Free:**
  - Smart Field Placement: 3 docs/mês

- **Plano Pro:**
  - Smart Field Placement: Ilimitado
  - Document Summary: Ilimitado
  - Intelligent Reminders: Ilimitado
  - Document Generation: 5 docs/mês

- **Plano Enterprise:**
  - Todas as features ilimitadas
  - Compliance Checker
  - Signing Chatbot
  - Fraud Detection
  - Document Generation ilimitado

---

## Próximos Passos Recomendados

1. **Validar com usuários:** Antes de implementar, conversar com 5-10 usuários atuais para entender quais dores são mais urgentes
2. **PoC do Smart Field Placement:** É o quick win mais visível e vendável. Implementar com OpenAI Vision API + pdf-lib
3. **PoC do Document Summary:** Segundo quick win. Simples de implementar (extrair texto do PDF + enviar para LLM)
4. **Infraestrutura AI Gateway:** Criar a camada de abstração cedo para não acumular dívida técnica
5. **Métricas:** Definir KPIs por feature AI (tempo economizado, taxa de conversão, NPS)
