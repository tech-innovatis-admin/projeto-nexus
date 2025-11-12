# 🐳 **NEXUS PLATFORM - GUIA COMPLETO DE DOCKERIZAÇÃO**

> **Plataforma de Produtos e Dados Municipais - Containerizada com Docker**
> 
> Este guia fornece instruções completas para dockerizar e executar o projeto NEXUS usando Docker e Docker Compose.

---

## 📋 **ÍNDICE**

1. [Pré-requisitos](#pré-requisitos)
2. [Arquitetura Docker](#arquitetura-docker)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Configuração Inicial](#configuração-inicial)
5. [Execução Rápida](#execução-rápida)
6. [Execução Manual](#execução-manual)
7. [Comandos Úteis](#comandos-úteis)
8. [Monitoramento](#monitoramento)
9. [Troubleshooting](#troubleshooting)
10. [Produção](#produção)
11. [Build ARM64 e Multi-arch](#build-arm64-e-multi-arch)

---

## 🔧 **PRÉ-REQUISITOS**

### **Windows**
1. **Docker Desktop** (versão 4.0+)
   - Download: https://www.docker.com/products/docker-desktop
   - Certificar que está rodando (ícone na bandeja do sistema)

2. **Git** (para clonar o repositório)
   - Download: https://git-scm.com/download/windows

3. **PowerShell** ou **Command Prompt**

### **Verificação de Instalação**
```powershell
# Verificar Docker
docker --version
docker-compose --version

# Verificar se Docker está rodando
docker ps
```

---

## 🏗️ **ARQUITETURA DOCKER**

O projeto NEXUS é containerizado com a seguinte arquitetura:

```mermaid
graph TB
    subgraph "Docker Network: nexus-network"
        A[NGINX Proxy<br/>:80, :443] --> B[NEXUS App<br/>:3000]
        B --> C[PostgreSQL + PostGIS<br/>:5432]
        B --> D[Redis Cache<br/>:6379]
    end
    
    subgraph "Volumes Persistentes"
        V1[nexus_postgres_data]
        V2[nexus_redis_data]
        V3[nexus_app_uploads]
    end
    
    C -.-> V1
    D -.-> V2
    B -.-> V3
```

### **Containers**
- **nexus-app**: Aplicação Next.js principal
- **postgres**: Banco PostgreSQL 15 com PostGIS
- **redis**: Cache Redis para sessões
- **nginx**: Proxy reverso (opcional, para produção)

---

## 📁 **ESTRUTURA DE ARQUIVOS**

Após a dockerização, sua estrutura ficará assim:

```
projeto-nexus/
├── 🐳 Docker Files
│   ├── Dockerfile                 # Build da aplicação
│   ├── docker-compose.yml         # Orquestração dos serviços
│   ├── .dockerignore              # Arquivos excluídos do build
│   └── docker/
│       ├── scripts/
│       │   ├── setup.ps1          # Setup para Windows
│       │   ├── setup.sh           # Setup para Linux/Mac
│       │   └── init-db.sh         # Inicialização do DB
│       └── nginx/                 # Configuração Nginx (produção)
├── 🔧 Application Files
│   ├── src/
│   │   └── app/api/health/        # Health check endpoint
│   ├── prisma/
│   │   └── init/                  # Scripts de inicialização DB
│   ├── package.json
│   ├── next.config.ts             # Configurado para standalone
│   └── .env                       # Variáveis de ambiente
└── 📚 Documentation
    └── DOCKER_GUIDE.md            # Este arquivo
```

---

## ⚙️ **CONFIGURAÇÃO INICIAL**

### **1. Arquivo .env**

Crie/edite o arquivo `.env` na raiz do projeto:

```env
# =============================================================================
# NEXUS PLATFORM - ENVIRONMENT VARIABLES
# =============================================================================

# Database Configuration
DATABASE_URL="postgresql://nexus_user:nexus_password_2025@postgres:5432/nexus_db?schema=public"

# JWT Configuration
JWT_SECRET="nexus_jwt_secret_2025_ALTERE_EM_PRODUCAO"

# Google Maps API
GOOGLE_MAPS_API_KEY="sua_chave_google_maps_aqui"

# AWS Configuration (opcional)
AWS_ACCESS_KEY_ID="sua_aws_access_key"
AWS_SECRET_ACCESS_KEY="sua_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="seu_bucket_s3"

# External APIs
OSRM_API_URL="http://router.project-osrm.org"

# Application Configuration
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
```

### **2. Configurações Importantes**

**⚠️ ALTERE ANTES DE USAR EM PRODUÇÃO:**
- `JWT_SECRET`: Use um valor criptograficamente seguro
- Senhas do banco: Altere `nexus_password_2025` no docker-compose.yml
- API Keys: Configure suas chaves reais do Google Maps e AWS

---

## 🚀 **EXECUÇÃO RÁPIDA**

### **Opção 1: Script Automatizado (Windows)**

```powershell
# Navegar para o diretório do projeto
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# Executar script de setup
.\docker\scripts\setup.ps1
```

### **Opção 2: Script Automatizado (Linux/Mac)**

```bash
# Navegar para o diretório do projeto
cd projeto-nexus

# Dar permissão e executar
chmod +x docker/scripts/setup.sh
./docker/scripts/setup.sh
```

### **Resultado Esperado**

```
✅ NEXUS está rodando com sucesso!

🌐 Aplicação: http://localhost:3000
📊 Database:  localhost:5432
🔴 Redis:     localhost:6379
```

---

## 🔧 **EXECUÇÃO MANUAL**

Se preferir controle total sobre o processo:

### **1. Build da Aplicação**

```powershell
# Build da imagem Docker
docker-compose build nexus-app
```

### **2. Iniciar Infraestrutura**

```powershell
# Iniciar banco e Redis
docker-compose up -d postgres redis

# Aguardar banco ficar disponível (1-2 minutos)
docker-compose logs -f postgres
```

### **3. Executar Migrations**

```powershell
# Executar migrations do Prisma
docker-compose run --rm nexus-app npx prisma migrate deploy

# Ou forçar sincronização (se necessário)
docker-compose run --rm nexus-app npx prisma db push --accept-data-loss
```

### **4. Iniciar Aplicação**

```powershell
# Iniciar aplicação NEXUS
docker-compose up -d nexus-app

# Verificar logs
docker-compose logs -f nexus-app
```

---

## 📋 **COMANDOS ÚTEIS**

### **Gerenciamento de Containers**

```powershell
# Ver status de todos os containers
docker-compose ps

# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Reiniciar apenas a aplicação
docker-compose restart nexus-app

# Reiniciar todos os serviços
docker-compose restart
```

### **Logs e Debugging**

```powershell
# Ver logs em tempo real (todos os serviços)
docker-compose logs -f

# Ver logs apenas da aplicação
docker-compose logs -f nexus-app

# Ver logs apenas do banco
docker-compose logs -f postgres

# Ver últimas 50 linhas de log
docker-compose logs --tail=50 nexus-app
```

### **Acesso aos Containers**

```powershell
# Acessar shell da aplicação
docker-compose exec nexus-app sh

# Acessar PostgreSQL
docker-compose exec postgres psql -U nexus_user -d nexus_db

# Acessar Redis
docker-compose exec redis redis-cli
```

### **Banco de Dados**

```powershell
# Backup do banco
docker-compose exec postgres pg_dump -U nexus_user nexus_db > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U nexus_user -d nexus_db < backup.sql

# Reset completo do banco (⚠️ PERDA DE DADOS)
docker-compose down
docker volume rm nexus_postgres_data
docker-compose up -d postgres
```

---

## 📊 **MONITORAMENTO**

### **Health Checks**

```powershell
# Verificar saúde da aplicação
curl http://localhost:3000/api/health

# Verificar banco
docker-compose exec postgres pg_isready -U nexus_user -d nexus_db

# Verificar Redis
docker-compose exec redis redis-cli ping
```

### **Métricas de Performance**

```powershell
# Uso de recursos
docker stats

# Espaço em disco dos volumes
docker system df

# Informações dos containers
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

---

## 🛠️ **TROUBLESHOOTING**

### **Problemas Comuns**

#### **1. Erro: "port is already allocated"**
```powershell
# Verificar o que está usando a porta
netstat -ano | findstr :3000

# Parar o processo ou alterar porta no docker-compose.yml
ports:
  - "3001:3000"  # Usar porta 3001 em vez de 3000
```

#### **2. Erro: "database connection failed"**
```powershell
# Verificar se o banco está rodando
docker-compose ps postgres

# Verificar logs do banco
docker-compose logs postgres

# Aguardar mais tempo para o banco inicializar
Start-Sleep -Seconds 30
```

#### **3. Erro: "Prisma generate failed"**
```powershell
# Limpar cache e regenerar
docker-compose down
docker-compose build --no-cache nexus-app
docker-compose up -d
```

#### **4. Erro: "out of disk space"**
```powershell
# Limpar recursos não utilizados
docker system prune -a

# Remover volumes órfãos
docker volume prune
```

### **Reset Completo**

Se algo der muito errado:

```powershell
# Parar tudo
docker-compose down --remove-orphans

# Remover volumes (⚠️ PERDA DE DADOS)
docker volume rm nexus_postgres_data nexus_redis_data nexus_app_uploads nexus_app_cache

# Rebuild completo
docker-compose build --no-cache

# Iniciar novamente
docker-compose up -d
```

---

## 🧬 **BUILD ARM64 E MULTI-ARCH**

Algumas instâncias EC2 (por exemplo, Graviton/ARM) exigem imagens `linux/arm64`. Você pode construir e publicar essas imagens usando o Docker Buildx. Já incluímos scripts prontos para Windows e Linux/Mac.

### Opção A — Windows (PowerShell)

```powershell
# Build ARM64 local (carrega no Docker Desktop)
.\u005cdockerscriptsuild-arm64.ps1 -ImageName nexus-app -Version v1.0.0

# Build ARM64 e push direto para ECR (recomendado)
.\u005cdockerscriptsuild-arm64.ps1 -Version v1.0.0 -EcrRepoUri 123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app -AwsRegion us-east-1 -Push

# Alternativa usando AccountId/Repository
.\u005cdockerscriptsuild-arm64.ps1 -Version v1.0.0 -AccountId 123456789012 -Repository nexus-app -AwsRegion us-east-1 -Push
```

Pré-requisitos: Docker Desktop com Buildx, AWS CLI configurado para push no ECR.

### Opção B — Linux/Mac (Bash)

```bash
# Build ARM64 local
./docker/scripts/build-arm64.sh nexus-app v1.0.0

# Build ARM64 e push para ECR
AWS_REGION=us-east-1 \
ECR_URI=123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app \
./docker/scripts/build-arm64.sh nexus-app v1.0.0 push
```

### Opção C — Comandos manuais com Buildx

```powershell
# Criar e usar builder (uma vez)
docker buildx create --name nexus-builder --use
docker buildx inspect --bootstrap

# Build ARM64 e push para ECR
$ECR_URI = "123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker buildx build --platform linux/arm64 --target runner -t "$ECR_URI:v1.0.0-arm64" --push .
```

### Multi-arch (amd64 + arm64)

Se preferir uma única tag que funcione em ambas as arquiteturas:

```powershell
docker buildx build `
  --platform linux/amd64,linux/arm64 `
  --target runner `
  -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.0 `
  --push .
```

### docker-compose (forçar plataforma, opcional)

Em hosts ARM64 geralmente não é necessário, mas você pode forçar a plataforma:

```yaml
services:
  nexus-app:
    platform: linux/arm64
```

> Observações técnicas:
> - As imagens usadas (node:18-alpine, redis:7-alpine, postgis/postgis:15-3.4-alpine) possuem variantes multi-arch.
> - Prisma em Alpine/ARM64 utiliza engines linux-musl ARM64 automaticamente; não são necessárias alterações no schema.
> - Em hosts x86, imagens ARM64 não são executáveis localmente sem emulação; use `--push` para publicar no ECR.

---

## 🚀 **PRODUÇÃO**

### **Configurações de Segurança**

1. **Alterar Senhas Padrão**
```yaml
# No docker-compose.yml
environment:
  POSTGRES_PASSWORD: senha_super_segura_aqui
```

2. **JWT Secret Seguro**
```env
JWT_SECRET="uma_chave_muito_longa_e_aleatoria_de_pelo_menos_32_caracteres"
```

3. **HTTPS com Nginx**
```powershell
# Ativar nginx com SSL
docker-compose --profile production up -d
```

### **Otimizações de Performance**

1. **Configurar Limites de Recursos**
```yaml
# No docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

2. **Configurar Backup Automático**
```powershell
# Criar script de backup diário
# Ver exemplos na pasta docker/scripts/
```

### **Monitoramento Avançado**

1. **Logs Centralizados**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

2. **Health Checks Customizados**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Teste a aplicação**: Acesse http://localhost:3000
2. **Configure API Keys**: Edite o arquivo `.env`
3. **Personalize**: Ajuste configurações conforme sua necessidade
4. **Deploy**: Use este setup como base para produção

---

## 📞 **SUPORTE**

Em caso de problemas:

1. **Verifique os logs**: `docker-compose logs -f`
2. **Consulte este guia**: Seção troubleshooting
3. **Reset completo**: Se necessário, use os comandos de reset

---

**🎉 Parabéns! Seu projeto NEXUS está dockerizado e pronto para uso!**

> **Criado por**: GitHub Copilot  
> **Data**: Novembro 2025  
> **Versão**: 1.0