#!/bin/bash
# =============================================================================
# SETUP DO BANCO DE DADOS - NEXUS Platform
# =============================================================================
# Script para inicialização do PostgreSQL com PostGIS
# Executa automaticamente quando o container PostgreSQL é criado
# =============================================================================

set -e

# Configurar variáveis
DB_NAME=${POSTGRES_DB:-nexus_db}
DB_USER=${POSTGRES_USER:-nexus_user}

echo "🚀 Iniciando setup do banco NEXUS..."

# Criar extensões necessárias
echo "📍 Criando extensão PostGIS..."
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
    -- Extensão PostGIS para dados geoespaciais
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
    CREATE EXTENSION IF NOT EXISTS postgis_raster;
    
    -- Extensão para UUID
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Extensão para criptografia
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    -- Configurar timezone
    SET timezone = 'America/Sao_Paulo';
EOSQL

echo "✅ Setup do banco concluído com sucesso!"
echo "📊 Extensões instaladas:"
echo "   - PostGIS (dados geoespaciais)"
echo "   - UUID (identificadores únicos)"
echo "   - PGCrypto (criptografia)"