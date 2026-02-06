# Digital Signer - Guia de Evolução

## Visão geral

Este documento descreve o roadmap de evolução da API Connexto Digital Signer.
Ele está organizado por prioridade e ordem de dependências.

---

## Fase 1 - Estrutura e Qualidade

### 1.1 Health Check

- Criar endpoint `/health` (readiness/liveness)
- Necessário para healthcheck do Docker e probes do Kubernetes
- Deve verificar conectividade com Postgres e Redis

### 1.2 Decorators de DTO no Swagger

- Adicionar `@ApiProperty()` em todos os DTOs (`CreateTenantDto`, `CreateDocumentDto`, `CreateSignerDto`, etc.)
- Garante que o Swagger/Scalar mostre nomes de campos, tipos, descrições e exemplos

### 1.3 Testes Unitários

- Começar por `SignaturesService` (regra de negócio mais crítica)
- Cobrir: addSigner, acceptSignature, areAllSignersSigned, finalizeDocument
- Cobrir casos de borda: já assinado, documento expirado, documento completo
- Depois expandir para `DocumentsService`, `TenantsService`, `AuthService`

### 1.4 Filtro Global de Exceções

- Criar um filtro global de exceções HTTP
- Padronizar o formato de erro: `{ statusCode, message, error, timestamp }`
- Tratar erros do TypeORM (chave duplicada, não encontrado) de forma elegante

### 1.5 CORS

- Configurar CORS no `main.ts` para consumo do frontend
- Usar variável de ambiente para origens permitidas

---

## Fase 2 - Robustez

### 2.1 Migrations do TypeORM

- Substituir `synchronize: true` por migrations versionadas
- Gerar migration inicial a partir das entidades atuais
- Adicionar scripts no `package.json` (`migration:generate`, `migration:run`, `migration:revert`)

### 2.2 Rate Limiting

- Adicionar `@nestjs/throttler` para rate limiting
- Proteger endpoints públicos (`/sign/:token`, `/auth/api-key/login`, `/tenants`)
- Configurar limites por tenant e por IP

### 2.3 Testes de Integração

- Fluxo completo: criar tenant -> criar documento -> adicionar signer -> assinar -> validar PDF final
- Usar `@nestjs/testing` com banco de teste
- Verificar emissão correta de eventos

### 2.4 Pipeline de CI

- Workflow no GitHub Actions
- Etapas: install -> lint -> test -> build
- Rodar em push na `main` e em pull requests

---

## Fase 3 - Funcionalidades de Produto

### 3.1 Frontend de Assinatura

- Página pública onde o signer visualiza e aceita o documento
- Acessível via `/sign/:token`
- Design mobile-first
- Mostrar preview do documento, dados do signer e checkbox de consentimento

### 3.2 Notificações por E-mail

- Implementar envio real via nodemailer
- Templates: convite ao signer, assinatura concluída, documento finalizado
- Enfileirar e-mails via Bull para confiabilidade e retry

### 3.3 Entrega de Webhooks

- Processor do Bull que faz POST dos eventos para URLs configuradas
- Retry com backoff exponencial
- Assinar payload com segredo do webhook (HMAC)
- Logar tentativas e status de entrega

### 3.4 Storage End-to-End

- Verificar upload/download no MinIO para o fluxo completo
- URLs presigned para download de documentos
- Auto-criação do bucket no startup (apenas dev)

---

## Fase 4 - Prontidão para Produção

### 4.1 Observabilidade

- Logs estruturados em produção (JSON via Pino)
- Adicionar correlation ID de requisição (`x-request-id`)
- Endpoint de métricas (formato Prometheus)
- Tracing distribuído (OpenTelemetry)

### 4.2 Hardening de Segurança

- Middleware Helmet
- Sanitização de entrada
- Mecanismo de rotação de API key
- Audit log para operações sensíveis
- Scanning de vulnerabilidades nas dependências

### 4.3 Performance

- Ajuste de pool de conexões do banco
- Cache Redis para configuração de tenant
- Paginação nos endpoints de listagem
- Limites de tamanho de upload de arquivo

### 4.4 Multiambiente

- Configuração de ambiente staging
- Feature flags
- Estratégia de deploy blue/green ou canary
- Estratégia de backup de banco

---

## Estado Atual

### Concluído

- [x] Estrutura do projeto (monorepo pnpm + Turborepo)
- [x] API NestJS com módulos: auth, tenants, documents, signatures, audit, notifications, webhooks, billing
- [x] Entidades TypeORM com índices
- [x] Entidade User (roles: owner/admin/member) e senha com bcryptjs
- [x] Login por email e senha (POST `/auth/login`) + logout (POST `/auth/logout`)
- [x] Auth guard unificado (JWT + API Key) com `@RequireAuthMethod`
- [x] Auditoria de auth (login success/failed, logout)
- [x] Migrations versionadas com `runMigrations()` no startup
- [x] Setup Docker (Postgres, Redis, MinIO)
- [x] Logger (NestJS + Pino com pino-pretty)
- [x] Swagger UI + Scalar UI
- [x] Prefixo global de rotas (`/digital-signer/v1`)
- [x] Agrupamento no Swagger via `@ApiTags`
- [x] Lógica de negócio: adicionar signer, aceitar assinatura, finalizar documento com página de evidências
- [x] Frontend Next.js 14 (App Router) com Tailwind + i18n (en/pt-br)
- [x] Telas: Login, Signup (slug auto + politica de senha), Dashboard shell
- [x] API client Axios + middleware de proteção de rotas

### Arquitetura

```
apps/
  api/                          # API NestJS
    src/
      common/config/            # Config do logger
      modules/
        auth/                   # Auth por API key + JWT
        users/                  # Usuarios e roles
        tenants/                # Multi-tenant
        documents/              # CRUD de documentos + storage
        signatures/             # Gestão de signers + fluxo de assinatura
        audit/                  # Audit log (event-driven)
        notifications/          # Notificações por e-mail (Bull)
        webhooks/               # Config de webhooks + entrega (Bull)
        billing/                # Uso/consumo (event-driven)
      shared/
        guards/                 # Guard de tenant
        pdf/                    # Manipulação de PDF (pdf-lib)
        storage/                # Storage compatível com S3
  web/                          # Frontend Next.js (Auth + Dashboard)
packages/
  shared/                       # Decorators e types compartilhados
  database/                     # Utilitários de banco
  events/                       # Constantes e types de eventos
docker/
  docker-compose.yml            # Postgres, Redis, MinIO, API
  Dockerfile                    # Build multi-stage Node 24
```

### Endpoints da API

| Grupo      | Método | Rota                                           |
|------------|--------|-------------------------------------------------|
| Tenants    | POST   | `/digital-signer/v1/tenants`                    |
| Tenants    | GET    | `/digital-signer/v1/tenants/:id`                |
| Tenants    | PATCH  | `/digital-signer/v1/tenants/:id`                |
| Auth       | POST   | `/digital-signer/v1/auth/api-key/login`         |
| Auth       | POST   | `/digital-signer/v1/auth/login`                 |
| Auth       | POST   | `/digital-signer/v1/auth/logout`                |
| Documents  | POST   | `/digital-signer/v1/documents`                  |
| Documents  | GET    | `/digital-signer/v1/documents/:id`              |
| Documents  | PATCH  | `/digital-signer/v1/documents/:id`              |
| Signers    | POST   | `/digital-signer/v1/documents/:documentId/signers` |
| Signers    | GET    | `/digital-signer/v1/documents/:documentId/signers` |
| Sign       | GET    | `/digital-signer/v1/sign/:token`                |
| Sign       | POST   | `/digital-signer/v1/sign/:token/accept`         |
| Audit      | GET    | `/digital-signer/v1/audit/entities/:entityType/:entityId` |
| Webhooks   | POST   | `/digital-signer/v1/webhooks/configs`           |
| Webhooks   | GET    | `/digital-signer/v1/webhooks/configs`           |
| Billing    | GET    | `/digital-signer/v1/billing/usage`              |

### URLs de Documentação (apenas dev)

- Swagger UI: `http://localhost:3000/digital-signer/v1/swagger`
- Scalar UI: `http://localhost:3000/digital-signer/v1/reference`
