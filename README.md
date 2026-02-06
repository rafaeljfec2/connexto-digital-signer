# Connexto Digital Signer

Monolith modular em NestJS (Node.js + TypeScript) para assinatura digital de documentos, preparado para multi-tenant, white-label, auditabilidade e futura extração para microserviços.

## Stack

- **Runtime:** Node.js 24+, TypeScript 5.x
- **Framework:** NestJS 10
- **ORM:** TypeORM 0.3 + PostgreSQL
- **Filas:** Redis + Bull
- **Storage:** S3-compatible (MinIO em dev, AWS S3 ou compatível em produção)
- **Auth:** JWT (curto) + API Key por tenant
- **PDF:** pdf-lib (geração de página de evidências, hash SHA-256)
- **Monorepo:** pnpm + Turborepo

## Estrutura do repositório

```
connexto-digital-signer/
├── apps/
│   └── api/                    # Aplicação NestJS
│       └── src/
│           ├── modules/        # Bounded contexts
│           │   ├── auth/
│           │   ├── tenants/
│           │   ├── documents/
│           │   ├── signatures/
│           │   ├── audit/
│           │   ├── notifications/
│           │   ├── webhooks/
│           │   └── billing/
│           ├── shared/         # Storage, PDF, guards
│           ├── app.module.ts
│           └── main.ts
├── packages/
│   ├── shared/                 # Utils, decorators, guards, interfaces
│   ├── database/               # Config TypeORM (opcional)
│   └── events/                 # Tipos e nomes de eventos de domínio
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Arquitetura

- **Multi-tenant:** Todas as entidades possuem `tenant_id`. Autenticação via JWT (após login com API Key) ou via header `x-api-key`.
- **White-label:** Módulo Tenants com branding (nome, cor, logo), textos legais e limites de uso configuráveis.
- **Comunicação entre módulos:** Apenas por eventos internos (EventEmitter2). Nenhum módulo acessa repositório ou serviço de outro módulo para regras de negócio; eventos publicados e consumidos por Audit, Notifications e Webhooks.
- **Audit:** Append-only, estrutura genérica com JSONB, sem update/delete.
- **PDF:** Original nunca é alterado; geração de novo PDF final com página de evidências (signatários, IP, User-Agent, timestamp UTC) e hash SHA-256 do binário final.

## Decisões técnicas

1. **ORM:** TypeORM com repositórios por entidade e migrations centralizadas.
2. **Event bus:** `@nestjs/event-emitter` (EventEmitter2). Eventos tipados em `@connexto/events`.
3. **Filas:** Bull (Redis) para notificações (e-mail) e webhooks (retry com backoff).
4. **Storage:** Interface em `@connexto/shared`, implementação S3 em `apps/api` (MinIO em dev).
5. **Guards:** Autenticação global (JWT ou API Key) com decorator `@Public()` para rotas abertas (criar tenant, login, página de assinatura).

## Como rodar

### Pré-requisitos

- Node.js 24+ (recomendado: 24.12.0)
- pnpm 9
- Docker e Docker Compose (para Postgres, Redis e MinIO)

### Versão do Node (troca automática)

O projeto usa Node 24 (`.nvmrc` com `24.12.0`). Para trocar automaticamente ao entrar na pasta:

**Opção 1 – direnv (recomendado)**  
Com [direnv](https://direnv.net/) instalado, na raiz do projeto rode uma vez:

```bash
direnv allow
```

A partir daí, ao entrar no diretório o direnv usará o Node definido no `.envrc`.

**Opção 2 – manual**  
Sempre que abrir o terminal no projeto:

```bash
nvm use
```

**Opção 3 – hook no shell (bash/zsh)**  
Para trocar automaticamente em todo projeto que tiver `.nvmrc`, adicione o hook do [nvm](https://github.com/nvm-sh/nvm#deeper-shell-integration) no seu `~/.bashrc` ou `~/.zshrc` conforme a documentação do nvm.

### Desenvolvimento local

1. Garantir Node 24 ativo (`nvm use` ou direnv) e instalar dependências:
   ```bash
   pnpm install
   ```

2. Subir dependências (Postgres, Redis, MinIO):
   ```bash
   cd docker && docker compose up -d postgres redis minio
   ```

3. Criar `.env` na raiz ou em `apps/api` (ou usar `.env.example`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=connexto_signer
   REDIS_HOST=localhost
   REDIS_PORT=6379
   S3_ENDPOINT=http://localhost:9000
   S3_REGION=us-east-1
   S3_BUCKET=documents
   S3_ACCESS_KEY_ID=minioadmin
   S3_SECRET_ACCESS_KEY=minioadmin
   JWT_SECRET=your-secret
   ```

4. Rodar a API:
   ```bash
   pnpm dev:api
   ```

### Build e Docker

- Build do monorepo:
  ```bash
  pnpm build
  ```

- Build da API:
  ```bash
  pnpm build:api
  ```

- Subir stack completa com Docker Compose:
  ```bash
  cd docker && docker compose up --build
  ```

A API estará em `http://localhost:3000`.

## Fluxo principal

1. **Criar tenant:** `POST /tenants` (público) → retorna tenant e API Key (exibir uma vez).
2. **Autenticar:** `POST /auth/api-key/login` com `{ "apiKey": "sk_..." }` → retorna JWT.
3. **Rotas protegidas:** Header `Authorization: Bearer <jwt>` ou `x-api-key: sk_...` e, quando aplicável, `x-tenant-id`.
4. **Documento:** `POST /documents` (multipart: file + title, opcional expiresAt) → documento criado, evento `document.created`.
5. **Signatários:** `POST /documents/:documentId/signers` com nome e e-mail → evento `signer.added` dispara e-mail de convite com link de assinatura.
6. **Assinatura:** Link `/sign/:token` (público) → `POST /sign/:token/accept` com consent → registro de IP, User-Agent, timestamp; quando todos assinam, geração do PDF final com página de evidências e evento `document.completed`.
7. **Audit / Webhooks:** Listeners dos eventos gravam audit e disparam webhooks (HMAC) configurados por tenant.

## Evolução para microserviços

- Cada módulo em `apps/api/src/modules/*` já é um bounded context com entidades, serviços e eventos próprios.
- Para extrair um contexto (ex.: Notifications):
  1. Mover o módulo para um novo app (ex.: `apps/notifications`) ou repositório.
  2. Trocar EventEmitter2 por um message broker (ex.: RabbitMQ, SQS) publicando os mesmos eventos.
  3. Manter contratos de evento (payloads) em um package compartilhado.
  4. Expor apenas APIs necessárias (ex.: health, métricas) no novo serviço.
- Banco: hoje shared schema com `tenant_id`; na extração pode-se manter DB compartilhado com schema por serviço ou DB por serviço, migrando as tabelas do contexto.
- Webhooks e Audit podem virar consumidores assíncronos dos mesmos eventos em filas, sem alterar produtores.

## Licença

CC0 1.0 Universal (ver LICENSE).
