# =============================================================================
# NEXUS PLATFORM - DOCKER SETUP PARA WINDOWS
# =============================================================================
# Script PowerShell para setup completo do ambiente Docker no Windows
# Executa todas as etapas necessárias para rodar o NEXUS
# =============================================================================

# Configurar codificação para suportar caracteres especiais
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Função para log colorido
function Write-Success {
    param($Message)
    Write-Host "[NEXUS SETUP] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

# Banner
Write-Host @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                     🚀 NEXUS PLATFORM - DOCKER SETUP                        ║
║                    Plataforma de Produtos e Dados Municipais                ║
║                           by Data Science Team                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Verificar se Docker está instalado
Write-Success "Verificando pré-requisitos..."

try {
    $dockerVersion = docker --version
    Write-Info "✅ Docker detectado: $dockerVersion"
} catch {
    Write-Error "Docker não está instalado. Instale o Docker Desktop primeiro."
    Write-Info "Download: https://www.docker.com/products/docker-desktop"
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Info "✅ Docker Compose detectado: $composeVersion"
} catch {
    Write-Error "Docker Compose não está disponível."
    exit 1
}

# Verificar se Docker está rodando
try {
    docker ps | Out-Null
    Write-Info "✅ Docker está rodando"
} catch {
    Write-Error "Docker não está rodando. Inicie o Docker Desktop primeiro."
    exit 1
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Warning "Arquivo .env não encontrado. Criando arquivo de exemplo..."
    
    $envContent = @"
# =============================================================================
# NEXUS PLATFORM - ENVIRONMENT VARIABLES
# =============================================================================

# Database Configuration
DATABASE_URL="postgresql://nexus_user:nexus_password_2025@localhost:5432/nexus_db?schema=public"

# JWT Configuration
JWT_SECRET="nexus_jwt_secret_2025_change_in_production"

# Google Maps API
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# AWS Configuration
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your_s3_bucket"

# External APIs
OSRM_API_URL="http://router.project-osrm.org"

# Application Configuration
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Warning "⚠️  Configure o arquivo .env com suas credenciais antes de continuar!"
}

# Parar containers existentes
Write-Success "Parando containers existentes..."
try {
    docker-compose down --remove-orphans 2>$null
} catch {
    Write-Info "Nenhum container existente encontrado"
}

# Opção para limpar volumes antigos
$cleanVolumes = Read-Host "Deseja limpar dados antigos do banco? (y/N)"
if ($cleanVolumes -eq "y" -or $cleanVolumes -eq "Y") {
    Write-Warning "Removendo volumes antigos..."
    try {
        docker volume rm nexus_postgres_data 2>$null
        docker volume rm nexus_redis_data 2>$null
        docker volume rm nexus_app_uploads 2>$null
        docker volume rm nexus_app_cache 2>$null
    } catch {
        Write-Info "Alguns volumes não existiam"
    }
}

# Build da aplicação
Write-Success "Fazendo build da aplicação NEXUS..."
Write-Info "Este processo pode demorar alguns minutos na primeira execução..."
docker-compose build --no-cache nexus-app

if ($LASTEXITCODE -ne 0) {
    Write-Error "Erro durante o build da aplicação"
    exit 1
}

# Iniciar serviços de infraestrutura primeiro
Write-Success "Iniciando banco PostgreSQL e Redis..."
docker-compose up -d postgres redis

# Aguardar banco ficar disponível
Write-Success "Aguardando banco de dados ficar disponível..."
$timeout = 60
$elapsed = 0
$interval = 5

do {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    Write-Info "Aguardando... ($elapsed/$timeout segundos)"
    
    try {
        $result = docker-compose exec -T postgres pg_isready -U nexus_user -d nexus_db 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Banco de dados está disponível!"
            break
        }
    } catch {
        # Continuar tentando
    }
    
    if ($elapsed -ge $timeout) {
        Write-Error "Timeout: Banco de dados não ficou disponível em $timeout segundos"
        Write-Info "Verifique os logs: docker-compose logs postgres"
        exit 1
    }
} while ($true)

# Executar migrations do Prisma
Write-Success "Executando migrations do Prisma..."
docker-compose run --rm nexus-app npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Erro nas migrations, tentando db push..."
    docker-compose run --rm nexus-app npx prisma db push --accept-data-loss
}

# Iniciar aplicação
Write-Success "Iniciando aplicação NEXUS..."
docker-compose up -d nexus-app

# Aguardar aplicação ficar disponível
Write-Success "Aguardando aplicação ficar disponível..."
$timeout = 60
$elapsed = 0

do {
    Start-Sleep -Seconds 5
    $elapsed += 5
    Write-Info "Testando aplicação... ($elapsed/$timeout segundos)"
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "✅ NEXUS está rodando com sucesso!"
            break
        }
    } catch {
        # Continuar tentando
    }
    
    if ($elapsed -ge $timeout) {
        Write-Warning "⚠️  Aplicação pode ainda estar inicializando..."
        Write-Info "Verifique os logs: docker-compose logs nexus-app"
        break
    }
} while ($true)

# Mostrar status dos containers
Write-Success "Status dos containers:"
docker-compose ps

# Instruções finais
Write-Host @"

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

"@ -ForegroundColor Green

Write-Info "Pressione qualquer tecla para abrir o navegador..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Abrir navegador
Start-Process "http://localhost:3000"