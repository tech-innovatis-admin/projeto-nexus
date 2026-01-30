# ====== STAGE 1: deps ======
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# ====== STAGE 2: build ======
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ====== STAGE 3: runner (standalone) ======
FROM node:20-alpine AS runner
WORKDIR /app

# Instala ferramentas essenciais para execução e healthcheck
RUN apk add --no-cache curl openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário não-root por segurança
RUN addgroup -S nextjs -g 1001 && adduser -S nextjs -u 1001
USER nextjs

# Copia os artefatos necessários
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Porta interna do container
ENV PORT=3000
EXPOSE 3000

# O standalone gera um server.js na raiz deste diretório
CMD ["node", "server.js"]