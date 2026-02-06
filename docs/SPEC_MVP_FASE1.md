## Especificacao Tecnica - MVP Fase 1

Status: CONCLUIDA

### Objetivo

Entregar a base do MVP com autenticacao por email e senha, auditoria de eventos de login, refatoracao de guards por tipo de consumo, e fundacao do frontend com login e shell do dashboard. O objetivo principal e reduzir atrito no acesso inicial e preparar a evolucao das fases seguintes.

### Escopo Incluido

- Entidade User e modulo de usuarios no backend.
- Login por email e senha com JWT.
- Auditoria de eventos de autenticacao.
- Refatoracao de guards para separar acessos por JWT e por API Key.
- Frontend Next.js com login, signup e dashboard shell.
- i18n (en/pt-br), slug auto e politica de senha no cadastro.

### Escopo Fora

- Dashboard com KPIs e upload de documentos.
- Fluxo de assinatura e campos de assinatura.
- Notificacoes por email, webhooks e storage end-to-end.
- Observabilidade e hardening avancado.

---

## Arquitetura de Autenticacao

### Entidade User

Arquivo: `apps/api/src/modules/users/entities/user.entity.ts`

Campos principais:

- `id` (uuid)
- `tenantId` (relacao logica com tenant)
- `email` (unico)
- `passwordHash`
- `name`
- `role` (owner | admin | member)
- `isActive`
- `createdAt`, `updatedAt`

### Fluxo Email e Senha

Endpoint: `POST /digital-signer/v1/auth/login`

Entrada:

- `email`
- `password`

Saida:

- `accessToken`
- `expiresIn`
- `user` (id, name, email, role, tenantId)

### Fluxo API Key

Endpoint atual:

- `POST /digital-signer/v1/auth/api-key/login`

Mantido para compatibilidade. Deve continuar retornando JWT com `authMethod = 'api_key'`.

### Payload JWT

Arquivo: `packages/shared/src/decorators/current-user.decorator.ts`

Estrutura:

- `sub` (userId para login por email, tenantId para API Key)
- `email`
- `tenantId`
- `role`
- `authMethod` (`jwt` | `api_key`)

---

## Refatoracao de Guards

### Principio

Separar os acessos por tipo de consumo:

- Rotas do dashboard: JWT + TenantGuard
- Rotas de API externa: API Key + TenantGuard

### Guards

Arquivos novos:

- `apps/api/src/common/guards/composite-auth.guard.ts`

Opcional (recomendado para MVP):

- `apps/api/src/common/guards/composite-auth.guard.ts`

Comportamento esperado:

- `CompositeAuthGuard`: tenta JWT primeiro, depois API Key, e registra `authMethod`

Decorator de restricao:

- `@RequireAuthMethod('jwt' | 'api_key')`

### Mapeamento por Controller

- `AuthController`: `@Public()`
- `SignController`: `@Public()`
- `HealthController`: `@Public()`
- `AuditController`: `JwtAuthGuard`
- `BillingController`: `JwtAuthGuard`
- `WebhooksController`: `ApiKeyAuthGuard`
- `DocumentsController`: `CompositeAuthGuard`
- `SignaturesController`: `CompositeAuthGuard`
- `TenantsController`:
  - `create`: `@Public()`
  - demais: `CompositeAuthGuard`

---

## Audit de Autenticacao

### Eventos Minimos

Eventos em `packages/events/src/event-names.ts`:

- `USER_LOGIN_SUCCESS`
- `USER_LOGIN_FAILED`
- `USER_LOGOUT`

Tipos em `packages/events/src/event-types.ts`:

- `UserLoginSuccessEvent`
- `UserLoginFailedEvent`
- `UserLogoutEvent`

### Handler

Arquivo: `apps/api/src/modules/audit/events/audit.events-handler.ts`

Regras:

- `USER_LOGIN_SUCCESS`: grava log com `tenantId`, `userId`, `ipAddress`, `userAgent`
- `USER_LOGIN_FAILED`: grava log com `email`, `ipAddress`, `userAgent`, `reason` e `tenantId = 'system'`
- `USER_LOGOUT`: grava log com `tenantId`, `userId` e `email`

### Justificativa

Auditoria de autenticacao fornece rastreabilidade juridica e suporte a auditorias internas e externas.

---

## Endpoints da API (Novos e Alterados)

| Metodo | Rota                                     | Descricao |
|--------|------------------------------------------|-----------|
| POST   | `/digital-signer/v1/auth/login`          | Login por email e senha |
| POST   | `/digital-signer/v1/auth/logout`         | Logout do usuario (JWT) |
| POST   | `/digital-signer/v1/auth/api-key/login`  | Login por API Key (mantido) |

---

## Frontend - Stack e Estrutura

### Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- @tanstack/react-query
- react-hook-form + zod
- axios
- sonner

### Estrutura de Pastas

```
apps/web/src/
  app/
    [locale]/
      (auth)/
        login/
          page.tsx
        signup/
          page.tsx
        layout.tsx
      (dashboard)/
        page.tsx
        layout.tsx
      layout.tsx
    layout.tsx
  features/
    auth/
      components/
      hooks/
      api.ts
  shared/
    ui/
    api/
    hooks/
    styles/
```

### Design Tokens

Tokens via CSS variables e Tailwind para white-label, com gradiente do login e cores primarias do tenant.

---

## Telas da Fase 1

### Login

Requisitos:

- Gradiente azul -> teal no fundo
- Card central com sombra
- Logo Connexto
- Formulario simples: email + senha
- CTA principal: "Entrar"
- Mobile-first

### Dashboard Shell

Requisitos:

- Header com logo, nome do tenant e avatar
- Sidebar placeholder (minima)
- Mensagem de boas-vindas

---

## Requisitos Nao-Funcionais

- Mobile-first em todas as telas
- White-label por tenant via CSS variables
- Estrutura feature-based
- Sem Redux no MVP
- Testes unitarios para auth e audit

---

## Migration e Seed

- Migration para tabela `users`
- Ao criar tenant, criar user OWNER com senha definida no cadastro
- Migrations executadas automaticamente no startup
