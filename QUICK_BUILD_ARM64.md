# ⚡ Referência Rápida - Build ARM64

> **Guia completo**: [`BUILD_ARM64_GUIDE.md`](BUILD_ARM64_GUIDE.md)

## 🎯 Comandos Essenciais

### 1️⃣ Build Local (Teste)

```powershell
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"
.\docker\scripts\build-arm64.ps1 -Version v1.0.2
```

### 2️⃣ Build e Push para Produção

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
```

### 3️⃣ Verificar Imagem no ECR

```powershell
aws ecr list-images --repository-name nexus-app --profile Innovatis --region us-east-1
```

### 4️⃣ Deploy na EC2

```powershell
.\deploy-to-ec2-ssm.ps1 -ImageUri "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.2-arm64"
```

---

## 📊 Informações do ECR

- **Account ID**: `891612552945`
- **Repository**: `nexus-app`
- **Region**: `us-east-1`
- **URI**: `891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app`

---

## 🔧 Troubleshooting Rápido

### Docker não está rodando
```powershell
# Abra o Docker Desktop e aguarde inicializar
```

### Login no ECR falhou
```powershell
aws configure --profile Innovatis
```

### Builder não existe
```powershell
docker buildx create --name nexus-builder --use
docker buildx inspect --bootstrap
```

### Limpar cache
```powershell
docker builder prune -a -f
docker system prune -a -f
```

---

## 📝 Versionamento

- `v1.0.x` → Patches
- `v1.x.0` → Features
- `vx.0.0` → Breaking changes

**Sempre incremente a versão ao fazer novo build!**

---

## ⏱️ Tempo Esperado

- **Build local**: 2-15 min
- **Build + Push**: 5-25 min

---

**💡 Dica**: Sempre use `-Push` quando estiver pronto para produção!

