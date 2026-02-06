## Roadmap de Implementacoes Futuras

### Visao Geral do Produto

Objetivo final: levar o usuario do upload do PDF ate a assinatura concluida com minimo atrito cognitivo e rastreabilidade completa.

Fluxo alvo:

1. Login
2. Dashboard
3. Upload de documento
4. Definir signatarios
5. Definir campos de assinatura
6. Revisao e envio
7. Status do documento
8. Experiencia do signatario

---

## Fase 2 - Dashboard + Upload

### Dashboard

Requisitos:

- Cards KPI: pendentes, concluidos, expirados
- CTA principal: "Novo Documento"
- Sem excesso de opcao ou informacao

Backend:

- Endpoint de contadores por tenant
- Listagem paginada de documentos recentes

Frontend:

- Cards KPI + skeleton loaders
- Empty state claro

### Upload de Documento

Requisitos:

- Drag and drop
- Apenas PDF
- Feedback visual imediato
- Nome do arquivo + tamanho
- CTA "Continuar"

Backend:

- Validacao de tipo de arquivo
- Limites de tamanho
- Hash do arquivo e storage

---

## Fase 3 - Signatarios + Review + Envio

### Definir Signatarios

Layout:

- Duas colunas
- Esquerda: lista de signatarios, email, ordem opcional
- Direita: preview estatico do PDF
- CTA: "Definir Campos de Assinatura"

Backend:

- CRUD de signatarios por documento
- Regras de ordem de assinatura (opcional)

### Campos de Assinatura

Layout:

- PDF central
- Sidebar direita: assinatura, data, nome
- Drag and drop simples
- Highlight do signatario ativo

Backend:

- Persistencia de campos no documento
- Validacao de campos obrigatorios

### Revisao e Envio

Checklist visual:

- Documento
- Signatarios
- Campos
- Prazo

CTA forte: "Enviar para Assinatura"

Backend:

- Disparo de notificacoes
- Transicao de status do documento

---

## Fase 4 - Status + Experiencia do Signatario

### Status do Documento

Requisitos:

- Timeline: Criado -> Visualizado -> Assinado -> Concluido
- Acoes: reenviar convite, copiar link, baixar evidencias

Backend:

- Registro de eventos de visualizacao
- Geração de evidencias

### Experiencia do Signatario

Requisitos:

- UX ultra simples
- Preview do documento
- CTA unico: "Assinar Documento"
- Modal de confirmacao
- Mensagem de sucesso

Backend:

- Endpoint publico para recuperar dados do signer
- Endpoint publico para aceitar assinatura
- Rate limiting dedicado

---

## Evolucoes de Longo Prazo

### Observabilidade

- Logs estruturados (Pino em JSON)
- Correlation ID por request
- Metrics Prometheus
- Tracing OpenTelemetry

### Hardening de Seguranca

- Helmet
- Sanitizacao de entrada
- Rotacao de API Key
- Auditoria de operacoes sensiveis
- Scanning de dependencias

### Performance

- Cache Redis por tenant
- Paginacao em listagens
- Limite de upload por perfil
- Otimizacao de storage

### Multiambiente

- Staging
- Feature flags
- Blue/green ou canary
- Backup e restore

### Assinatura Digital Qualificada

- ICP-Brasil (A1/A3)
- Carimbo de tempo
- Prova juridica avancada

### Integracoes e Produto

- SSO (SAML / OIDC)
- Templates de documentos
- Bulk signing
- API publica versionada
