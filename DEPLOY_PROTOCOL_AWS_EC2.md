# Protocolo de Deploy AWS EC2 - Innovatis

**Versão:** 1.0  
**Data:** 2025-12-04  
**Autor:** Vinícius Torres - Data Scientist Innovatis - Tech Lead  
**Status:** Oficializado

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Arquitetura de Referência](#3-arquitetura-de-referência)
4. [Fluxo Completo de Deploy](#4-fluxo-completo-de-deploy)
5. [Cenário A: Instância com 1 Aplicação](#5-cenário-a-instância-com-1-aplicação)
6. [Cenário B: Instância com 2+ Aplicações](#6-cenário-b-instância-com-2-aplicações)
7. [Configuração de DNS](#7-configuração-de-dns)
8. [Configuração de SSL/TLS (Certbot)](#8-configuração-de-ssltls-certbot)
9. [Troubleshooting](#9-troubleshooting)
10. [Checklist de Deploy](#10-checklist-de-deploy)
11. [Comandos de Referência Rápida](#11-comandos-de-referência-rápida)

---

## 1. Visão Geral

Este documento estabelece o protocolo oficial da Innovatis para deploy de aplicações containerizadas em instâncias AWS EC2 utilizando Docker, ECR, e Nginx como reverse proxy.

### 1.1 Princípios

- **Reprodutibilidade**: Qualquer membro da equipe deve conseguir executar o deploy seguindo este protocolo
- **Isolamento**: Cada aplicação roda em seu próprio container com porta dedicada
- **Segurança**: HTTPS obrigatório em produção via Let's Encrypt
- **Observabilidade**: Logs centralizados e health checks configurados

### 1.2 Stack Padrão

| Componente | Tecnologia |
|------------|------------|
| Container Runtime | Docker |
| Registry | AWS ECR |
| Compute | AWS EC2 (ARM64 Graviton recomendado) |
| Reverse Proxy | Nginx |
| SSL/TLS | Let's Encrypt (Certbot) |
| DNS | Registro A apontando para IP público da EC2 |

---

## 2. Pré-requisitos

### 2.1 Máquina Local (Windows)

```powershell
# Verificar instalações necessárias
docker --version          # Docker Desktop com suporte a buildx
aws --version             # AWS CLI v2
git --version             # Git
ssh -V                    # OpenSSH client
```

### 2.2 Credenciais AWS

```powershell
# Configurar credenciais (uma única vez)
aws configure
# AWS Access Key ID: [sua-key]
# AWS Secret Access Key: [sua-secret]
# Default region name: us-east-1
# Default output format: json

# Verificar identidade
aws sts get-caller-identity
```

**⚠️ IMPORTANTE**: Anote o `Account ID` retornado. Será usado em todo o processo.

### 2.3 Instância EC2

A instância deve ter:

- **Sistema Operacional**: Amazon Linux 2023 (ARM64 para Graviton, x86_64 para Intel/AMD)
- **Security Group** com portas liberadas:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
  - Portas das aplicações (ex: 3000, 8000) - apenas para debug, não expor publicamente
- **Elastic IP** associado (IP fixo)
- **IAM Role** com permissão `AmazonEC2ContainerRegistryReadOnly` para pull do ECR

### 2.4 Chave SSH

```powershell
# A chave .pem deve existir localmente
# Exemplo de caminho padrão:
$KEY_PATH = "C:\Users\$env:USERNAME\.ssh\innovatis-aws-key.pem"

# Verificar permissões (deve ser restrita ao usuário atual)
icacls $KEY_PATH
```

---

## 3. Arquitetura de Referência

### 3.1 Diagrama de Rede

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instance                         │
│                    IP: 98.91.74.236                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     NGINX                             │  │
│  │              (Reverse Proxy + SSL)                    │  │
│  │                                                       │  │
│  │  :443 ─► nexus.innovatismc.com  ─► localhost:3000     │  │
│  │  :443 ─► gopro.innovatismc.com  ─► localhost:8000     │  │
│  │  :443 ─► app3.innovatismc.com   ─► localhost:9000     │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │  Container  │   │  Container  │   │  Container  │        │
│  │   Nexus     │   │   GoPro     │   │    App3     │        │
│  │  :3000      │   │  :8000      │   │  :9000      │        │
│  └─────────────┘   └─────────────┘   └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Mapeamento de Portas Padrão

| Aplicação  | Porta Container | Porta Host | Domínio |
|------------|-----------------|------------|---------|
| Nexus      | 3000 | 3000 | nexus.innovatismc.com |
| GoPro      | 3000 | 8000 | gopro.innovatismc.com |
| [Nova App] | 3000 | 9000 | [app].innovatismc.com |

**Regra**: Porta host incrementa de 1000 em 1000 (3000, 8000, 9000, 10000...).

---

## 4. Fluxo Completo de Deploy

### 4.1 Etapa 1: Preparar Dockerfile

O Dockerfile deve estar otimizado para produção. Exemplo para Rails:

```dockerfile
# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.3.4
FROM ruby:$RUBY_VERSION-slim AS base

WORKDIR /rails
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test"

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential curl git libpq-dev node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js (para assets)
ARG NODE_VERSION=20.17.0
ENV PATH=/usr/local/node/bin:$PATH
RUN curl -sL https://github.com/nodenv/node-build/archive/master.tar.gz | tar xz -C /tmp/ && \
    /tmp/node-build-master/bin/node-build "${NODE_VERSION}" /usr/local/node && \
    rm -rf /tmp/node-build-master

# Install Yarn
ARG YARN_VERSION=1.22.22
RUN npm install -g yarn@$YARN_VERSION

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# ⚠️ CRÍTICO: Precompile assets com secret dummy
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# Final stage
FROM base

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl libpq-dev postgresql-client && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

# ⚠️ CRÍTICO: Criar usuário não-root e ajustar permissões - TEM QUE VER ISSO
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp

USER rails:rails

EXPOSE 3000
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]
```

**⚠️ PULOS DO GATO - Dockerfile:**

1. **Multi-stage build** é obrigatório para reduzir tamanho da imagem
2. **SECRET_KEY_BASE_DUMMY=1** permite precompilar assets sem secret real
3. **Usuário não-root** (rails:rails) é obrigatório por segurança
4. **chown ANTES do USER** - o chown deve acontecer como root
5. **Não usar `chmod -R 777`** - sempre especificar ownership correto

### 4.2 Etapa 2: Build da Imagem (Local)

```powershell
# Definir variáveis de ambiente
$AWS_ACCOUNT_ID = "891612552945"
$AWS_REGION = "us-east-1"
$APP_NAME = "gopro"
$ECR_REPO = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"

# ⚠️ CRÍTICO: Build para arquitetura ARM64 (Graviton)
docker buildx build --platform linux/arm64 -t "${APP_NAME}:latest" --load .

# Tag para ECR
docker tag "${APP_NAME}:latest" "${ECR_REPO}:latest"
```

**⚠️ PULOS DO GATO - Build:**

1. **`--platform linux/arm64`**: Obrigatório para instâncias Graviton. Sem isso, o container não inicia.
2. **`--load`**: Carrega a imagem no Docker local após build.
3. **Docker Desktop**: Habilitar "Use containerd for pulling and storing images" em Settings > Features in development.

### 4.3 Etapa 3: Push para ECR

```powershell
# Autenticar no ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Criar repositório se não existir
aws ecr create-repository --repository-name $APP_NAME --region $AWS_REGION 2>$null

# Push da imagem
docker push "${ECR_REPO}:latest"
```

### 4.4 Etapa 4: Deploy na EC2

```powershell
# Conectar via SSH
$EC2_IP = "98.91.74.236"
$KEY_PATH = "C:\caminho\para\sua-chave.pem"

ssh -i $KEY_PATH ec2-user@$EC2_IP
```

**Na EC2:**

```bash
# Definir variáveis
export AWS_ACCOUNT_ID="891612552945"
export AWS_REGION="us-east-1"
export APP_NAME="gopro"
export HOST_PORT="8000"
export ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"

# Autenticar no ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Pull da imagem
docker pull "${ECR_REPO}:latest"

# Parar container existente (se houver)
docker stop ${APP_NAME}-container 2>/dev/null || true
docker rm ${APP_NAME}-container 2>/dev/null || true

# Rodar novo container
docker run -d \
  --name ${APP_NAME}-container \
  --restart unless-stopped \
  -p ${HOST_PORT}:3000 \
  -e RAILS_ENV=production \
  -e SECRET_KEY_BASE="sua-secret-key-base-aqui" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require" \
  ${ECR_REPO}:latest

# Verificar se está rodando
docker ps | grep ${APP_NAME}

# Health check
curl http://localhost:${HOST_PORT}/up
```

**⚠️ PULOS DO GATO - Container:**

1. **`--restart unless-stopped`**: Container reinicia automaticamente após reboot da EC2
2. **Porta mapeamento**: `-p HOST_PORT:CONTAINER_PORT` (ex: `-p 8000:3000`)
3. **Variáveis de ambiente**: Passar via `-e` ou `--env-file`
4. **Health check**: Sempre testar `curl localhost:PORT/up` antes de configurar Nginx
5. **NUNCA commitar** `SECRET_KEY_BASE` ou `DATABASE_URL` no repositório. Usar variáveis de ambiente ou secrets manager.

### 4.5 Atualização de Container Existente (Re-deploy)

Quando a aplicação já está rodando e você precisa atualizar:

**Na máquina local:**
```powershell
# 1. Build nova imagem
docker buildx build --platform linux/arm64 -t "${APP_NAME}:latest" --load .
docker tag "${APP_NAME}:latest" "${ECR_REPO}:latest"

# 2. Push para ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
docker push "${ECR_REPO}:latest"
```

**Na EC2:**
```bash
# 1. Pull nova imagem
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com
docker pull ${ECR_REPO}:latest

# 2. Substituir container (⚠️ haverá ~5s de downtime)
docker stop ${APP_NAME}-container
docker rm ${APP_NAME}-container
docker run -d \
  --name ${APP_NAME}-container \
  --restart unless-stopped \
  -p ${HOST_PORT}:3000 \
  -e RAILS_ENV=production \
  -e SECRET_KEY_BASE="$SECRET_KEY_BASE" \
  -e DATABASE_URL="$DATABASE_URL" \
  ${ECR_REPO}:latest

# 3. Verificar
docker ps | grep ${APP_NAME}
curl http://localhost:${HOST_PORT}/up
```

**⚠️ DICA**: Para zero-downtime, considere usar Docker Compose com rolling updates ou ECS.

---

## 5. Cenário A: Instância com 1 Aplicação

### 5.1 Configuração Nginx Simples

```bash
# Instalar Nginx (Amazon Linux 2023)
sudo dnf install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Criar estrutura de diretórios
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

### 5.2 Editar nginx.conf Principal

```bash
sudo tee /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;
    client_max_body_size 100M;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # ⚠️ CRÍTICO: Incluir apenas sites-enabled, NÃO conf.d
    include /etc/nginx/sites-enabled/*;
}
EOF
```

### 5.3 Criar Configuração do Site

```bash
export APP_NAME="gopro"
export DOMAIN="gopro.innovatismc.com"
export HOST_PORT="8000"

sudo tee /etc/nginx/sites-available/${APP_NAME}.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
    }
}
EOF
```

### 5.4 Ativar Site e Testar

```bash
# ⚠️ CRÍTICO: Criar link simbólico para ativar
sudo ln -sf /etc/nginx/sites-available/${APP_NAME}.conf /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# Testar acesso local
curl -v http://127.0.0.1/up -H "Host: ${DOMAIN}"
```

---

## 6. Cenário B: Instância com 2+ Aplicações

### 6.1 Estrutura de Arquivos

```
/etc/nginx/
├── nginx.conf                    # Configuração principal
├── sites-available/
│   ├── nexus.conf                # App 1 - porta 3000
│   ├── gopro.conf                # App 2 - porta 8000
│   └── app3.conf                 # App 3 - porta 9000
└── sites-enabled/
    ├── nexus.conf -> ../sites-available/nexus.conf
    ├── gopro.conf -> ../sites-available/gopro.conf
    └── app3.conf -> ../sites-available/app3.conf
```

### 6.2 Configuração nginx.conf para Múltiplas Apps

**⚠️ CRÍTICO**: O `nginx.conf` **NÃO DEVE** ter blocos `server {}` próprios. Toda configuração de sites deve estar em `sites-enabled/`.

```bash
sudo tee /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;
    client_max_body_size 100M;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # ⚠️ CRÍTICO: NÃO incluir conf.d/* - pode ter configurações conflitantes
    # include /etc/nginx/conf.d/*.conf;
    
    # Incluir APENAS sites-enabled
    include /etc/nginx/sites-enabled/*;
}
EOF
```

### 6.3 Template de Site para Nova Aplicação

```bash
# Variáveis a definir para cada nova app
export APP_NAME="novaapp"
export DOMAIN="novaapp.innovatismc.com"
export HOST_PORT="9000"

# Criar configuração
sudo tee /etc/nginx/sites-available/${APP_NAME}.conf << EOF
# ${APP_NAME} - Porta ${HOST_PORT}
# Domínio: ${DOMAIN}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Logs específicos da aplicação
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;

    location / {
        proxy_pass http://127.0.0.1:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Health check endpoint
    location /up {
        proxy_pass http://127.0.0.1:${HOST_PORT}/up;
        access_log off;
    }
}
EOF

# Ativar o site
sudo ln -sf /etc/nginx/sites-available/${APP_NAME}.conf /etc/nginx/sites-enabled/

# Testar e recarregar
sudo nginx -t && sudo systemctl reload nginx
```

### 6.4 Remover Configurações Default Conflitantes

**⚠️ CRÍTICO**: Arquivos em `/etc/nginx/conf.d/` podem conflitar com sites-enabled.

```bash
# Verificar arquivos em conf.d
ls -la /etc/nginx/conf.d/

# Remover ou mover configurações default
sudo rm -f /etc/nginx/conf.d/default.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/000-default

# Verificar o que está ativo
ls -la /etc/nginx/sites-enabled/
```

### 6.5 Diagnóstico de Conflitos

```bash
# Ver qual server_name está sendo usado para cada requisição
sudo nginx -T | grep -E "server_name|listen"

# Testar qual site responde para um domínio específico
curl -v http://127.0.0.1/up -H "Host: gopro.innovatismc.com"
curl -v http://127.0.0.1/up -H "Host: nexus.innovatismc.com"
```

---

## 7. Configuração de DNS

### 7.1 Registro A no Provedor DNS

Para cada aplicação, criar um registro A apontando para o IP público da EC2:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | nexus | 98.91.74.236 | 300 |
| A | gopro | 98.91.74.236 | 300 |
| A | app3 | 98.91.74.236 | 300 |

### 7.2 Verificar Propagação DNS

```bash
# Do seu computador local
nslookup gopro.innovatismc.com
dig gopro.innovatismc.com +short

# Verificar se resolve para o IP correto
ping gopro.innovatismc.com
```

**⚠️ IMPORTANTE**: Aguarde a propagação DNS (5-30 minutos) antes de solicitar certificado SSL.

---

## 8. Configuração de SSL/TLS (Certbot)

### 8.1 Instalar Certbot

```bash
# Amazon Linux 2023
sudo dnf install certbot python3-certbot-nginx -y
```

### 8.2 Obter Certificado

**⚠️ PRÉ-REQUISITOS antes de rodar certbot:**

1. ✅ Container rodando e respondendo em localhost:PORT
2. ✅ Nginx configurado e rodando
3. ✅ Site habilitado em sites-enabled (link simbólico criado)
4. ✅ DNS propagado (domínio resolve para IP da EC2)
5. ✅ Portas 80 e 443 liberadas no Security Group

```bash
# Solicitar certificado (interativo)
sudo certbot --nginx -d gopro.innovatismc.com

# OU para múltiplos domínios de uma vez
sudo certbot --nginx -d nexus.innovatismc.com -d gopro.innovatismc.com
```

**Respostas durante a execução:**
1. Email: seu-email@innovatismc.com
2. Terms of Service: Y (Yes)
3. Share email with EFF: N (opcional)

### 8.3 O que o Certbot Faz Automaticamente

O Certbot modifica o arquivo em `sites-available/` para:

```nginx
server {
    server_name gopro.innovatismc.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        # ... configurações de proxy
    }

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/gopro.innovatismc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gopro.innovatismc.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Redirect HTTP to HTTPS
server {
    if ($host = gopro.innovatismc.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name gopro.innovatismc.com;
    return 404;
}
```

### 8.4 Configurar Auto-Renovação

```bash
# Habilitar timer de renovação automática
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Verificar status
sudo systemctl status certbot-renew.timer

# Testar renovação (dry-run)
sudo certbot renew --dry-run
```

### 8.5 Renovação Manual (se necessário)

```bash
# Renovar todos os certificados
sudo certbot renew

# Renovar certificado específico
sudo certbot certonly --nginx -d gopro.innovatismc.com
```

---

## 9. Troubleshooting

### 9.1 Container não inicia

```bash
# Ver logs do container
docker logs gopro-container

# Problemas comuns:
# 1. Arquitetura errada (x86 vs ARM)
#    Solução: Rebuild com --platform linux/arm64

# 2. Permissão negada em pastas
#    Solução: Verificar chown no Dockerfile

# 3. Variáveis de ambiente faltando
#    Solução: Verificar -e flags no docker run
```

### 9.2 Nginx retorna 502 Bad Gateway

```bash
# Container está rodando?
docker ps | grep gopro

# Container responde localmente?
curl http://localhost:8000/up

# Verificar logs do Nginx
sudo tail -50 /var/log/nginx/error.log

# Problema comum: porta errada no proxy_pass
# Verificar se HOST_PORT no nginx.conf bate com docker run -p
```

### 9.3 Nginx retorna 301 para HTTPS (antes de ter SSL)

**Causa**: Outra configuração está capturando o request e redirecionando.

```bash
# Verificar qual config está respondendo
sudo nginx -T | grep -B5 "301"

# Verificar se há default server
sudo nginx -T | grep "default_server"

# Solução: Remover includes de conf.d no nginx.conf
sudo sed -i '/include.*conf\.d/d' /etc/nginx/nginx.conf
```

### 9.4 Certbot falha ao obter certificado

```bash
# Verificar se DNS está propagado
dig gopro.innovatismc.com +short
# Deve retornar o IP da EC2

# Verificar se porta 80 está aberta
sudo ss -tlnp | grep :80

# Verificar Security Group na AWS Console
# Portas 80 e 443 devem estar abertas para 0.0.0.0/0

# Testar acesso externo
curl -v http://gopro.innovatismc.com/
```

### 9.5 Aplicação mostra site errado (outra app)

**Causa**: Nginx está usando o server errado como default.

```bash
# Verificar server_names configurados
sudo nginx -T | grep server_name

# Verificar arquivos em sites-enabled
ls -la /etc/nginx/sites-enabled/

# Garantir que cada app tem server_name único
# Verificar se não há default_server marcado incorretamente
```

### 9.6 SSH: Permission Denied ou Host Key Changed

```powershell
# No Windows, remover known_hosts antigo
Remove-Item "$env:USERPROFILE\.ssh\known_hosts"

# Reconectar com StrictHostKeyChecking=no (primeira vez)
ssh -i "chave.pem" -o StrictHostKeyChecking=no ec2-user@IP
```

### 9.7 Docker pull falha: "no basic auth credentials"

```bash
# Reautenticar no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# Verificar se IAM Role da EC2 tem permissão ECR
aws sts get-caller-identity
```

### 9.8 Rollback para Versão Anterior

Se o deploy quebrou a aplicação:

```bash
# 1. Listar imagens disponíveis no ECR (com tags/digests)
aws ecr describe-images --repository-name gopro --region us-east-1 --query 'imageDetails[*].[imagePushedAt,imageDigest]' --output table

# 2. Parar container atual
docker stop gopro-container && docker rm gopro-container

# 3. Rodar versão anterior (usando digest específico)
# Substitua sha256:xxxx pelo digest da versão estável
docker run -d \
  --name gopro-container \
  --restart unless-stopped \
  -p 8000:3000 \
  -e RAILS_ENV=production \
  -e SECRET_KEY_BASE="$SECRET_KEY_BASE" \
  -e DATABASE_URL="$DATABASE_URL" \
  891612552945.dkr.ecr.us-east-1.amazonaws.com/gopro@sha256:xxxx

# 4. Verificar
curl http://localhost:8000/up
```

**⚠️ PREVENÇÃO**: Sempre mantenha pelo menos 2-3 versões no ECR. Configure lifecycle policy para não deletar imagens recentes.

---

## 10. Checklist de Deploy

### 10.1 Pré-Deploy

- [ ] Código testado localmente
- [ ] Dockerfile atualizado e funcional
- [ ] Variáveis de ambiente documentadas
- [ ] DATABASE_URL configurada
- [ ] SECRET_KEY_BASE gerada (para Rails: `rails secret`)

### 10.2 Build & Push

- [ ] Build com arquitetura correta (`--platform linux/arm64`)
- [ ] Tag aplicada corretamente
- [ ] Login no ECR realizado
- [ ] Push concluído sem erros
- [ ] Verificar imagem no ECR Console

### 10.3 Deploy EC2

- [ ] SSH conectado à instância
- [ ] Login no ECR na EC2
- [ ] Pull da nova imagem
- [ ] Container antigo parado e removido
- [ ] Novo container iniciado com todas as env vars
- [ ] Health check passou (`curl localhost:PORT/up`)
- [ ] `docker ps` mostra container UP

### 10.4 Nginx (primeira vez)

- [ ] Nginx instalado e rodando
- [ ] Estrutura sites-available/sites-enabled criada
- [ ] nginx.conf limpo (sem server blocks, sem include conf.d)
- [ ] Configuração do site criada em sites-available
- [ ] Link simbólico criado em sites-enabled
- [ ] `nginx -t` passou
- [ ] `systemctl reload nginx` executado
- [ ] Teste com curl e Host header funcionou

### 10.5 DNS & SSL

- [ ] Registro A criado no provedor DNS
- [ ] DNS propagado (dig/nslookup retorna IP correto)
- [ ] Certbot instalado
- [ ] Certificado obtido com sucesso
- [ ] Auto-renovação habilitada
- [ ] Acesso HTTPS funcionando no browser

### 10.6 Pós-Deploy

- [ ] Aplicação acessível via domínio
- [ ] Login/funcionalidades testadas
- [ ] Logs sem erros críticos
- [ ] Documentar porta usada para esta app

---

## 11. Comandos de Referência Rápida

### 11.1 Docker

```bash
# Listar containers
docker ps -a

# Logs do container
docker logs -f nome-container

# Entrar no container
docker exec -it nome-container /bin/bash

# Parar e remover
docker stop nome-container && docker rm nome-container

# Limpar imagens não usadas
docker image prune -a
```

### 11.2 Nginx

```bash
# Status
sudo systemctl status nginx

# Testar configuração
sudo nginx -t

# Recarregar (sem downtime)
sudo systemctl reload nginx

# Reiniciar
sudo systemctl restart nginx

# Ver configuração completa
sudo nginx -T

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 11.3 Certbot

```bash
# Listar certificados
sudo certbot certificates

# Renovar todos
sudo certbot renew

# Deletar certificado
sudo certbot delete --cert-name dominio.com

# Obter novo certificado
sudo certbot --nginx -d dominio.com
```

### 11.4 AWS ECR

```bash
# Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Listar repositórios
aws ecr describe-repositories --region us-east-1

# Listar imagens em um repo
aws ecr describe-images --repository-name REPO_NAME --region us-east-1
```

### 11.5 Debug Geral

```bash
# Verificar portas em uso
sudo ss -tlnp

# Verificar processos
ps aux | grep nginx
ps aux | grep docker

# Testar endpoint local
curl -v http://localhost:8000/up

# Testar via Nginx
curl -v http://127.0.0.1/up -H "Host: gopro.innovatismc.com"

# Testar HTTPS externo
curl -v https://gopro.innovatismc.com/up
```

---

## Anexo A: Script de Deploy Automatizado

Salvar como `deploy.sh` na raiz do projeto:

```bash
#!/bin/bash
set -e

# ============================================================================
# Configuração - EDITAR PARA CADA PROJETO
# ============================================================================
APP_NAME="gopro"
HOST_PORT="8000"
AWS_ACCOUNT_ID="891612552945"
AWS_REGION="us-east-1"
EC2_IP="98.91.74.236"
DOMAIN="${APP_NAME}.innovatismc.com"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/innovatis-aws-key.pem}"

# Credenciais (definir antes de rodar ou via env vars)
SECRET_KEY_BASE="${SECRET_KEY_BASE:-}"
DATABASE_URL="${DATABASE_URL:-}"

# ============================================================================
# Derivados
# ============================================================================
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
IMAGE_NAME="${ECR_REPO}:latest"

# ============================================================================
# Funções
# ============================================================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_prereqs() {
    log "Verificando pré-requisitos..."
    command -v docker >/dev/null || { log "ERRO: Docker não encontrado"; exit 1; }
    command -v aws >/dev/null || { log "ERRO: AWS CLI não encontrada"; exit 1; }
    [ -n "$SECRET_KEY_BASE" ] || { log "ERRO: SECRET_KEY_BASE não definida"; exit 1; }
    [ -n "$DATABASE_URL" ] || { log "ERRO: DATABASE_URL não definida"; exit 1; }
    [ -f "$KEY_PATH" ] || { log "ERRO: Chave SSH não encontrada em $KEY_PATH"; exit 1; }
}

build_image() {
    log "Building image para ARM64..."
    docker buildx build --platform linux/arm64 -t "${APP_NAME}:latest" --load .
    docker tag "${APP_NAME}:latest" "${IMAGE_NAME}"
}

push_to_ecr() {
    log "Autenticando no ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    log "Criando repositório se não existir..."
    aws ecr create-repository --repository-name ${APP_NAME} --region ${AWS_REGION} 2>/dev/null || true
    
    log "Pushing image..."
    docker push "${IMAGE_NAME}"
}

deploy_to_ec2() {
    log "Deploy na EC2..."
    ssh -i "${KEY_PATH}" -o StrictHostKeyChecking=no ec2-user@${EC2_IP} << ENDSSH
        set -e
        
        # Login ECR
        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
        
        # Pull nova imagem
        docker pull ${IMAGE_NAME}
        
        # Parar container atual
        docker stop ${APP_NAME}-container 2>/dev/null || true
        docker rm ${APP_NAME}-container 2>/dev/null || true
        
        # Iniciar novo container
        docker run -d \
            --name ${APP_NAME}-container \
            --restart unless-stopped \
            -p ${HOST_PORT}:3000 \
            -e RAILS_ENV=production \
            -e SECRET_KEY_BASE="${SECRET_KEY_BASE}" \
            -e DATABASE_URL="${DATABASE_URL}" \
            ${IMAGE_NAME}
        
        # Health check
        sleep 5
        curl -f http://localhost:${HOST_PORT}/up || exit 1
        
        echo "Deploy concluído com sucesso!"
ENDSSH
}

# ============================================================================
# Main
# ============================================================================
main() {
    check_prereqs
    build_image
    push_to_ecr
    deploy_to_ec2
    log "✅ Deploy completo! Acesse: https://${DOMAIN}"
}

main "$@"
```

---

## Anexo B: Histórico de Versões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2025-12-04 | Tech Lead | Versão inicial baseada no deploy GoPro |

---

## Anexo C: Referências

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [AWS ECR User Guide](https://docs.aws.amazon.com/AmazonECR/latest/userguide/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)

---

**FIM DO DOCUMENTO**

*Este protocolo é propriedade da Innovatis e deve ser seguido em todos os deploys de produção.*
