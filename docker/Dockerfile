FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/events/package.json ./packages/events/
COPY packages/ai/package.json ./packages/ai/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN pnpm --filter api --filter shared --filter database --filter events build
RUN pnpm deploy --filter api --prod /app/deployed

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/deployed .
EXPOSE 3000
CMD ["node", "dist/main.js"]
