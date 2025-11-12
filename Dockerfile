# =============================================================================
# DOCKERFILE PARA NEXUS - Plataforma de Produtos e Dados Municipais
# =============================================================================
# Multi-stage build otimizado para Next.js 15 + Prisma + PostgreSQL
# Criado por: GitHub Copilot - Novembro 2025
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Base Image com Node.js
# -----------------------------------------------------------------------------
FROM node:18-alpine AS base

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/cache/apk/*

# Configurar diretório de trabalho
WORKDIR /app

# -----------------------------------------------------------------------------
# STAGE 2: Dependencies - Instalar todas as dependências
# -----------------------------------------------------------------------------
FROM base AS deps

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependências de produção e desenvolvimento
RUN npm ci --prefer-offline --no-audit --progress=false

# Gerar Prisma Client
RUN npx prisma generate

# -----------------------------------------------------------------------------
# STAGE 3: Builder - Build da aplicação
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma/

# Copiar código fonte
COPY . .

# Configurar variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Gerar Prisma Client novamente no contexto de build
RUN npx prisma generate

# Build da aplicação Next.js
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 4: Runner - Imagem final otimizada
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

# Configurar ambiente de produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar arquivos de build do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./src/generated

# Copiar scripts essenciais
COPY --from=builder /app/package.json ./package.json

# Copiar script de inicialização
COPY docker/scripts/start.sh /app/start.sh

# Dar permissões ao script
RUN chmod +x /app/start.sh

# Configurar permissões e mudar usuário
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 3000

# Configurar variável de porta
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicialização
CMD ["/app/start.sh"]