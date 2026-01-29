# ====== STAGE 1: deps ======
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ====== STAGE 2: build ======
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ====== STAGE 3: runner (standalone) ======
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário não-root
RUN addgroup -S nextjs -g 1001 && adduser -S nextjs -u 1001
USER nextjs

# Copia o standalone (server.js + node_modules mínimos) e static/public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Porta interna do container
ENV PORT=3000
EXPOSE 3000

# O standalone gera um server.js na raiz desse "standalone"
CMD ["node", "server.js"]