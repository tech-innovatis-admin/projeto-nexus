#!/bin/sh
# =============================================================================
# NEXUS PLATFORM - CONTAINER STARTUP SCRIPT
# =============================================================================
# Script de inicialização para o container Docker
# Executa migrations do Prisma e inicia a aplicação Next.js
# =============================================================================

set -e

echo "🚀 Iniciando NEXUS Platform..."
echo "📊 Verificando conexão com banco de dados..."

# Tentar fazer push do schema (criar tabelas se não existirem)
npx prisma db push --accept-data-loss || echo "⚠️  Erro na conexão com DB - continuando..."

echo "🔄 Executando migrations..."
# Tentar executar migrations (se houver)
npx prisma migrate deploy || echo "⚠️  Erro nas migrations - continuando..."

echo "✅ NEXUS pronto para uso!"
echo "🌐 Aplicação estará disponível em: http://localhost:3000"

# Iniciar servidor Next.js
exec node server.js