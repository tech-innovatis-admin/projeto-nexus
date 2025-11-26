# ✅ Checklist de Build ARM64 - NEXUS

## 📋 Pré-Build

Antes de iniciar, verifique:

- [ ] Docker Desktop está **aberto e rodando** (ícone verde na bandeja)
- [ ] Você está no **diretório correto** do projeto
- [ ] Arquivo `.env` está **configurado** com todas as variáveis
- [ ] AWS CLI está **configurado** com perfil `Innovatis`
- [ ] Você tem **espaço em disco** suficiente (>10 GB livre)
- [ ] Você decidiu a **nova versão** (ex: v1.0.3)

---

## 🏗️ Processo de Build

### Para Teste Local

```powershell
# 1. Navegar
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# 2. Build
.\docker\scripts\build-arm64.ps1 -Version v1.0.X

# 3. Verificar
docker images | Select-String "nexus-app"
```

- [ ] Comando executado com sucesso
- [ ] Imagem aparece na lista
- [ ] Tag está correta (v1.0.X-arm64)

---

### Para Produção (ECR + EC2)

```powershell
# 1. Navegar
cd "C:\Users\victo\OneDrive\Desktop\Arquivos Victor\NEXUS\projeto-nexus"

# 2. Login ECR
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# 3. Build e Push
.\docker\scripts\build-arm64.ps1 `
  -Version v1.0.X `
  -EcrRepoUri 891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app `
  -AwsRegion us-east-1 `
  -Push

# 4. Verificar no ECR
aws ecr list-images --repository-name nexus-app --profile Innovatis --region us-east-1

# 5. Deploy na EC2
.\deploy-to-ec2-ssm.ps1 -ImageUri "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.X-arm64"
```

Checklist passo a passo:

- [ ] **Login ECR**: Recebeu "Login Succeeded"
- [ ] **Build iniciado**: Vê progresso do build no terminal
- [ ] **Build concluído**: Mensagem de sucesso exibida
- [ ] **Push concluído**: Imagem enviada para ECR
- [ ] **Imagem no ECR**: Listagem mostra a nova versão
- [ ] **Deploy iniciado**: Script de deploy executado
- [ ] **Deploy concluído**: Container rodando na EC2
- [ ] **Health check**: http://[EC2_IP]:3000/api/health responde OK

---

## 🎯 Versão Atual

Anote aqui a última versão criada:

| Data | Versão | ECR | EC2 | Observações |
|------|--------|-----|-----|-------------|
| 26/11/2025 | v1.0.2 | ✅ | ✅ | Build inicial ARM64 |
| _____  | v1.0._ | ⬜ | ⬜ | _______________ |
| _____  | v1.0._ | ⬜ | ⬜ | _______________ |
| _____  | v1._._ | ⬜ | ⬜ | _______________ |

---

## 🔍 Verificações Pós-Deploy

Após o deploy, verifique:

- [ ] Aplicação responde: `http://[EC2_IP]:3000`
- [ ] Health check OK: `http://[EC2_IP]:3000/api/health`
- [ ] Login funciona corretamente
- [ ] Mapas carregam normalmente
- [ ] APIs de rotas respondem
- [ ] Logs não mostram erros críticos

---

## 🚨 Em Caso de Erro

### Build Falhou

```powershell
# Limpar cache e tentar novamente
docker builder prune -a -f
.\docker\scripts\build-arm64.ps1 -Version v1.0.X -Push
```

- [ ] Cache limpo
- [ ] Build reexecutado
- [ ] Erro resolvido

### Login ECR Falhou

```powershell
# Reconfigurar AWS CLI
aws configure --profile Innovatis

# Verificar credenciais
aws sts get-caller-identity --profile Innovatis

# Tentar login novamente
aws ecr get-login-password --region us-east-1 --profile Innovatis | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com
```

- [ ] AWS CLI reconfigurado
- [ ] Credenciais válidas
- [ ] Login bem-sucedido

### Deploy Falhou

```powershell
# Verificar logs do SSM
aws ssm get-command-invocation `
  --command-id [COMMAND_ID] `
  --instance-id i-0f97359729f6589f6 `
  --profile Innovatis `
  --region us-east-1

# Ou conectar via SSH e verificar
ssh -i saep-backend-key.pem ubuntu@98.91.74.236
docker logs nexus-app
```

- [ ] Logs verificados
- [ ] Erro identificado
- [ ] Correção aplicada

---

## 📞 Suporte

**Documentação completa**: [`BUILD_ARM64_GUIDE.md`](BUILD_ARM64_GUIDE.md)  
**Comandos rápidos**: [`QUICK_BUILD_ARM64.md`](QUICK_BUILD_ARM64.md)

---

## 💡 Dicas

1. **Sempre incremente a versão** antes de fazer novo build
2. **Faça build local primeiro** para testar
3. **Anote a versão** na tabela acima
4. **Verifique o health check** após cada deploy
5. **Mantenha backup** das versões estáveis

---

**Data da última atualização**: ___________  
**Última versão estável**: v1.0.___  
**Próxima versão planejada**: v1.0.___

