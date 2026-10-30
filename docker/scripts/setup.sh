#!/bin/bash
# =============================================================================
# INICIALIZAÇÃO COMPLETA DO NEXUS DOCKER
# =============================================================================
# Script para setup completo do ambiente Docker
# Executa todas as etapas necessárias para rodar o NEXUS
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[NEXUS SETUP]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Banner
echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🚀 NEXUS PLATFORM - DOCKER SETUP                        ║
║                    Plataforma de Produtos e Dados Municipais                ║
║                           by Data Science Team                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

# Verificar se Docker está instalado
log "Verificando pré-requisitos..."
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Instale o Docker Desktop primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado."
    exit 1
fi

info "✅ Docker e Docker Compose detectados"

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    warning "Arquivo .env não encontrado. Criando arquivo de exemplo..."
    cat > .env << 'EOL'
# =============================================================================
# NEXUS PLATFORM - ENVIRONMENT VARIABLES
# =============================================================================

# Database Configuration
DATABASE_URL="postgresql://nexus_user:nexus_password_2025@localhost:5432/nexus_db?schema=public"

# JWT Configuration
JWT_SECRET="nexus_jwt_secret_2025_change_in_production"

# Google Maps API
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# CARTO Basemaps (tiles do mapa)
API_CARTO_KEY="your_carto_basemaps_api_key_here"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your_s3_bucket"

# External APIs
OSRM_API_URL="http://router.project-osrm.org"

# Application Configuration
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
EOL
    warning "⚠️  Configure o arquivo .env com suas credenciais antes de continuar!"
fi

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down --remove-orphans 2>/dev/null || true

# Limpar volumes antigos (opcional)
read -p "Deseja limpar dados antigos do banco? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    warning "Removendo volumes antigos..."
    docker volume rm nexus_postgres_data 2>/dev/null || true
    docker volume rm nexus_redis_data 2>/dev/null || true
fi

# Build da aplicação
log "Fazendo build da aplicação NEXUS..."
docker-compose build --no-cache nexus-app

# Iniciar serviços de infraestrutura primeiro
log "Iniciando banco PostgreSQL e Redis..."
docker-compose up -d postgres redis

# Aguardar banco ficar disponível
log "Aguardando banco de dados ficar disponível..."
sleep 30

# Verificar se o banco está respondendo
log "Testando conexão com banco..."
docker-compose exec -T postgres pg_isready -U nexus_user -d nexus_db

# Executar migrations do Prisma
log "Executando migrations do Prisma..."
docker-compose run --rm nexus-app npx prisma migrate deploy

# Iniciar aplicação
log "Iniciando aplicação NEXUS..."
docker-compose up -d nexus-app

# Aguardar aplicação ficar disponível
log "Aguardando aplicação ficar disponível..."
sleep 20

# Verificar se está funcionando
log "Testando aplicação..."
if curl -f http://localhost:3000 &>/dev/null; then
    log "✅ NEXUS está rodando com sucesso!"
else
    warning "⚠️  Aplicação pode ainda estar inicializando..."
fi

# Mostrar status dos containers
log "Status dos containers:"
docker-compose ps

# Instruções finais
echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                           🎉 SETUP CONCLUÍDO!                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

🌐 Aplicação: http://localhost:3000
📊 Database:  localhost:5432
🔴 Redis:     localhost:6379

📋 COMANDOS ÚTEIS:
  docker-compose logs -f          # Ver logs em tempo real
  docker-compose ps               # Status dos containers  
  docker-compose down             # Parar todos os serviços
  docker-compose up -d            # Iniciar em background
  docker-compose restart nexus-app # Reiniciar apenas a aplicação

⚠️  IMPORTANTE:
  1. Configure suas API keys no arquivo .env
  2. Para produção, altere as senhas padrão
  3. Configure SSL/HTTPS se necessário

🔧 TROUBLESHOOTING:
  - Se houver erro de conexão com DB, aguarde mais tempo
  - Verifique os logs: docker-compose logs nexus-app
  - Para resetar: docker-compose down && docker volume prune
"