# 🏗️ Guia Completo de Build ARM64 - NEXUS Platform

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Inicial](#configuração-inicial)
4. [Build Local (Teste)](#build-local-teste)
5. [Build e Push para ECR](#build-e-push-para-ecr)
6. [Verificação da Imagem](#verificação-da-imagem)
7. [Troubleshooting](#troubleshooting)
8. [Referência de Comandos](#referência-de-comandos)

---

## 🎯 Visão Geral

Este guia explica como criar imagens Docker ARM64 do projeto NEXUS para deploy em instâncias EC2 ARM64 (Graviton). O processo usa Docker Buildx para compilação multiplataforma.

### Por que ARM64?

- **Custo-benefício**: Instâncias Graviton são ~20% mais baratas
- **Performance**: Melhor eficiência energética
- **Compatibilidade**: Necessário para EC2 Graviton (t4g, m6g, etc.)

---

## 🔧 Pré-requisitos

### 1. Docker Desktop Instalado e Rodando

Verifique se o Docker está instalado:

```powershell
docker --version
```

**Esperado:**
```
Docker version 28.x.x ou superior
```

Se não estiver instalado, baixe em: https://www.docker.com/products/docker-desktop

### 2. Docker Buildx Disponível

Verifique se o Buildx está disponível:

```powershell
docker buildx version
```

**Esperado:**
```
github.com/docker/buildx v0.29.x ou superior
```

### 3. AWS CLI Configurado (apenas para push no ECR)

Verifique se o AWS CLI está instalado e configurado:

```powershell
aws --version
aws configure list
```

**Configuração necessária:**
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default profile: `Innovatis` (ou outro configurado)

Se não estiver configurado:

```powershell
aws configure --profile Innovatis
```

### 4. Acesso ao ECR (Elastic Container Registry)

Verifique se você tem acesso ao ECR:

```powershell
aws ecr describe-repositories --profile Innovatis --region us-east-1
```

**Informações do ECR NEXUS:**
- **Account ID**: `891612552945`
- **Repository**: `nexus-app`
- **Region**: `us-east-1`
- **URI Completo**: `891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app`

---

## ⚙️ Configuração Inicial

### 1. Navegue para o Diretório do Projeto

Abra o PowerShell e navegue até o diretório do projeto:

```powershell
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"
```

Confirme que está no diretório correto:

```powershell
Get-Location
```

### 2. Verifique se o Builder Existe

Liste os builders disponíveis:

```powershell
docker buildx ls
```

Se `nexus-builder` não existir na lista, ele será criado automaticamente pelo script.

### 3. Verifique o Arquivo .env

Certifique-se de que o arquivo `.env` existe na raiz do projeto com as variáveis necessárias:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="sua_chave_secreta"
GOOGLE_MAPS_API_KEY="sua_chave_google"
AWS_ACCESS_KEY_ID="sua_chave_aws"
AWS_SECRET_ACCESS_KEY="sua_chave_secreta_aws"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="seu_bucket"
```

---

## 🏗️ Build Local (Teste)

Use este método para criar a imagem localmente e testá-la antes de fazer push para o ECR.

### Comando Básico

```powershell
.\docker\scripts\build-arm64.ps1 -ImageName nexus-app -Version v1.0.2
```

### Parâmetros do Script

| Parâmetro | Descrição | Padrão | Obrigatório |
|-----------|-----------|--------|-------------|
| `-ImageName` | Nome da imagem Docker | `nexus-app` | Não |
| `-Version` | Versão/tag da imagem | Timestamp atual | Não |
| `-Target` | Stage do Dockerfile | `runner` | Não |
| `-AwsRegion` | Região AWS | `us-east-1` | Não |
| `-Push` | Fazer push para ECR | Não | Não |

### Exemplo Completo (Build Local)

```powershell
# Build da versão v1.0.2
.\docker\scripts\build-arm64.ps1 -ImageName nexus-app -Version v1.0.2 -Target runner
```

### O que Acontece no Build Local?

1. ✅ Cria ou usa o builder `nexus-builder`
2. ✅ Faz build para arquitetura `linux/arm64`
3. ✅ Usa multi-stage build (base → deps → builder → runner)
4. ✅ Carrega a imagem no Docker Desktop local (`--load`)
5. ✅ Tag final: `nexus-app:v1.0.2-arm64`

### Tempo Esperado

- **Primeira vez**: 10-15 minutos (depende da internet e CPU)
- **Builds subsequentes**: 2-5 minutos (usa cache de layers)

### Verificar a Imagem Criada

Após o build, verifique se a imagem foi criada:

```powershell
docker images | Select-String "nexus-app"
```

**Esperado:**
```
nexus-app   v1.0.2-arm64   [IMAGE_ID]   X minutes ago   XXX MB
```

### Inspecionar a Imagem

Veja detalhes da imagem criada:

```powershell
docker inspect nexus-app:v1.0.2-arm64
```

Para ver a arquitetura:

```powershell
docker inspect nexus-app:v1.0.2-arm64 | Select-String "Architecture"
```

**Esperado:**
```
"Architecture": "arm64"
```

---

## 🚀 Build e Push para ECR

Use este método quando estiver pronto para fazer deploy na EC2.

### Passo 1: Fazer Login no ECR

Primeiro, autentique-se no ECR:

```powershell
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com
```

**Esperado:**
```
Login Succeeded
```

### Passo 2: Build e Push Automático

Use o parâmetro `-Push` para fazer build e push em um único comando:

```powershell
.\docker\scripts\build-arm64.ps1 `
  -Version v1.0.2 `
  -EcrRepoUri 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app `
  -AwsRegion us-east-1 `
  -Push
```

### Método Alternativo (Usando AccountId e Repository)

```powershell
.\docker\scripts\build-arm64.ps1 `
  -Version v1.0.2 `
  -AccountId 891612552945 `
  -Repository nexus-app `
  -AwsRegion us-east-1 `
  -Push
```

### O que Acontece no Build + Push?

1. ✅ Faz login automático no ECR
2. ✅ Cria ou usa o builder `nexus-builder`
3. ✅ Faz build para arquitetura `linux/arm64`
4. ✅ Faz push direto para o ECR (`--push`)
5. ✅ Tag final no ECR: `891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.2-arm64`

### Tempo Esperado

- **Build + Upload**: 15-25 minutos na primeira vez
- **Builds subsequentes**: 5-10 minutos (depende da conexão)

---

## ✅ Verificação da Imagem

### 1. Verificar no ECR via AWS CLI

Liste as imagens no repositório ECR:

```powershell
aws ecr list-images --repository-name nexus-app --profile Innovatis --region us-east-1
```

### 2. Verificar Detalhes da Imagem

Veja detalhes completos da imagem:

```powershell
aws ecr describe-images --repository-name nexus-app --image-ids imageTag=v1.0.2-arm64 --profile Innovatis --region us-east-1
```

### 3. Verificar Tamanho da Imagem

```powershell
aws ecr describe-images `
  --repository-name nexus-app `
  --image-ids imageTag=v1.0.2-arm64 `
  --profile Innovatis `
  --region us-east-1 `
  --query 'imageDetails[0].imageSizeInBytes' `
  --output text
```

### 4. Verificar Arquitetura da Imagem

```powershell
aws ecr batch-get-image `
  --repository-name nexus-app `
  --image-ids imageTag=v1.0.2-arm64 `
  --accepted-media-types "application/vnd.docker.distribution.manifest.v2+json" `
  --profile Innovatis `
  --region us-east-1 `
  --query 'images[0].imageManifest' `
  --output text
```

---

## 🔧 Troubleshooting

### Erro: "Docker não está rodando"

**Sintoma:**
```
error during connect: This error may indicate that the docker daemon is not running
```

**Solução:**
1. Abra o Docker Desktop
2. Aguarde até o ícone ficar verde na bandeja do sistema
3. Execute o comando novamente

---

### Erro: "Builder não encontrado"

**Sintoma:**
```
ERROR: failed to find driver "docker-container"
```

**Solução:**

```powershell
# Criar o builder manualmente
docker buildx create --name nexus-builder --use
docker buildx inspect --bootstrap
```

---

### Erro: "Login no ECR falhou"

**Sintoma:**
```
Error saving credentials: error storing credentials
```

**Solução:**

```powershell
# Verificar AWS CLI
aws sts get-caller-identity --profile Innovatis

# Reconfigurar se necessário
aws configure --profile Innovatis

# Tentar login novamente
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com
```

---

### Erro: "Build falhou - Prisma"

**Sintoma:**
```
Error: prisma generate failed
```

**Solução:**

```powershell
# Limpar cache do Docker
docker builder prune -f

# Fazer build sem cache
.\docker\scripts\build-arm64.ps1 -Version v1.0.2 -Push
```

Ou adicione `--no-cache` manualmente:

```powershell
docker buildx build --platform linux/arm64 --target runner --no-cache -t nexus-app:v1.0.2-arm64 --push .
```

---

### Erro: "Disco cheio"

**Sintoma:**
```
no space left on device
```

**Solução:**

```powershell
# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar build cache
docker builder prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Ver espaço usado
docker system df
```

---

### Build Muito Lento

**Possíveis causas e soluções:**

1. **Primeira execução**: É normal, aguarde (10-15 min)

2. **Conexão lenta**: 
   ```powershell
   # Verificar velocidade
   Test-NetConnection -ComputerName google.com -Port 443
   ```

3. **CPU/RAM limitados**:
   - Feche outros aplicativos
   - Ajuste recursos do Docker Desktop (Settings → Resources)

4. **Cache não está sendo usado**:
   ```powershell
   # Verificar cache
   docker buildx du
   ```

---

## 📚 Referência de Comandos

### Comandos Completos para Copiar e Colar

#### 1. Build Local (Teste Rápido)

```powershell
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"
.\docker\scripts\build-arm64.ps1 -ImageName nexus-app -Version v1.0.2
```

#### 2. Build e Push para ECR (Produção)

```powershell
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# Login no ECR
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# Build e Push
.\docker\scripts\build-arm64.ps1 `
  -Version v1.0.2 `
  -EcrRepoUri 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app `
  -AwsRegion us-east-1 `
  -Push
```

#### 3. Verificar Imagem Criada

```powershell
# Local
docker images | Select-String "nexus-app"

# ECR
aws ecr list-images --repository-name nexus-app --profile Innovatis --region us-east-1
```

#### 4. Build Manual (Sem Script)

```powershell
# Criar builder (se não existir)
docker buildx create --name nexus-builder --use
docker buildx inspect --bootstrap

# Login ECR
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# Build e Push
docker buildx build `
  --platform linux/arm64 `
  --target runner `
  -t 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.2-arm64 `
  --push `
  .
```

---

## 🎯 Fluxo Completo de Trabalho

### Cenário 1: Desenvolvimento (Teste Local)

```powershell
# 1. Navegar para o projeto
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# 2. Build local
.\docker\scripts\build-arm64.ps1 -Version v1.0.2

# 3. Verificar
docker images | Select-String "nexus-app"

# 4. Testar localmente (opcional, mas não roda em x86)
docker inspect nexus-app:v1.0.2-arm64
```

### Cenário 2: Deploy em Produção

```powershell
# 1. Navegar para o projeto
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# 2. Login no ECR
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# 3. Build e Push
.\docker\scripts\build-arm64.ps1 `
  -Version v1.0.2 `
  -EcrRepoUri 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app `
  -AwsRegion us-east-1 `
  -Push

# 4. Verificar no ECR
aws ecr describe-images --repository-name nexus-app --image-ids imageTag=v1.0.2-arm64 --profile Innovatis --region us-east-1

# 5. Deploy na EC2 (usar script de deploy)
.\deploy-to-ec2-ssm.ps1 -ImageUri "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.2-arm64"
```

### Cenário 3: Atualização Rápida

```powershell
# 1. Navegar
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# 2. Incrementar versão e fazer push
$newVersion = "v1.0.3"

aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

.\docker\scripts\build-arm64.ps1 `
  -Version $newVersion `
  -EcrRepoUri 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app `
  -Push

# 3. Deploy
.\deploy-to-ec2-ssm.ps1 -ImageUri "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:$newVersion-arm64"
```

---

## 📝 Notas Importantes

### Versionamento

Recomendações para versionamento:

- **v1.0.x**: Patches e correções
- **v1.x.0**: Novas funcionalidades
- **vx.0.0**: Mudanças breaking

Exemplo de histórico:
- `v1.0.0`: Versão inicial
- `v1.0.1`: Correção de bugs
- `v1.0.2`: Melhorias de performance
- `v1.1.0`: Nova funcionalidade de rotas
- `v2.0.0`: Migração de arquitetura

### Tags no ECR

Cada build cria uma tag com sufixo `-arm64`:
- Input: `v1.0.2`
- Tag final: `v1.0.2-arm64`

### Cache de Build

O Docker Buildx mantém cache entre builds. Para forçar rebuild completo:

```powershell
docker builder prune -a -f
```

### Tamanho da Imagem

A imagem final ARM64 tem aproximadamente:
- **Comprimida**: ~300-400 MB
- **Descomprimida**: ~800-900 MB

### Limitações

⚠️ **Importante**: Imagens ARM64 **não rodam** em máquinas x86 (Windows/Intel/AMD). Use apenas para:
- Push para ECR
- Deploy em EC2 Graviton
- Inspeção de metadados

---

## 🆘 Suporte

### Logs do Build

Para ver logs detalhados do build:

```powershell
# Durante o build, pressione Ctrl+C não funciona
# Aguarde o build completar ou use outro terminal

# Ver logs do builder
docker buildx du
docker buildx ls
```

### Limpeza Completa

Se algo der muito errado:

```powershell
# Remover builder
docker buildx rm nexus-builder

# Limpar tudo
docker system prune -a --volumes -f

# Recriar builder
docker buildx create --name nexus-builder --use
docker buildx inspect --bootstrap
```

---

## ✅ Checklist Pré-Build

Antes de fazer o build, verifique:

- [ ] Docker Desktop está rodando
- [ ] Você está no diretório correto do projeto
- [ ] Arquivo `.env` está configurado
- [ ] AWS CLI está configurado (para push)
- [ ] Você tem espaço em disco suficiente (>10 GB)
- [ ] Builder `nexus-builder` existe (ou será criado)
- [ ] Você está usando a versão correta (`v1.0.x`)

---

**📅 Última atualização**: Novembro 2025  
**👤 Criado por**: Data Science Team - Innovatis MC  
**📦 Versão do guia**: 1.0

---

**🎉 Pronto! Agora você pode fazer builds ARM64 de forma autônoma!**

