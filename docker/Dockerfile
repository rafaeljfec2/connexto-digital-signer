FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/events/package.json ./packages/events/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
WORKDIR /app
CMD ["node", "apps/api/dist/main.js"]
