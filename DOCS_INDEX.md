# 📚 Índice de Documentação - NEXUS Platform

## 🏗️ Dockerização e Build

### Principais

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[BUILD_ARM64_GUIDE.md](BUILD_ARM64_GUIDE.md)** | 📖 Guia completo de build ARM64 | Primeira vez ou dúvidas detalhadas |
| **[QUICK_BUILD_ARM64.md](QUICK_BUILD_ARM64.md)** | ⚡ Referência rápida de comandos | Uso frequente, comandos principais |
| **[BUILD_CHECKLIST.md](BUILD_CHECKLIST.md)** | ✅ Checklist passo a passo | Garantir que não esqueceu nada |
| **[BUILD_COMMANDS.txt](BUILD_COMMANDS.txt)** | 📋 Comandos prontos para copiar | Copiar e colar no terminal |
| **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** | 🐳 Guia completo de Docker | Setup inicial, docker-compose |

### Deploy

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[deploy-to-ec2.ps1](deploy-to-ec2.ps1)** | 🔑 Deploy via SSH | Deploy com chave SSH |
| **[deploy-to-ec2-ssm.ps1](deploy-to-ec2-ssm.ps1)** | 🔒 Deploy via SSM | Deploy seguro sem SSH |

---

## 🗺️ Funcionalidades do Sistema

### Sistema de Rotas

| Documento | Descrição |
|-----------|-----------|
| [SISTEMA_ROTAS_MULTIMODAL.md](docs/SISTEMA_ROTAS_MULTIMODAL.md) | Sistema de rotas aéreo + terrestre |
| [IMPLEMENTACAO_ROTAS_MULTIMODAL_2025.md](IMPLEMENTACAO_ROTAS_MULTIMODAL_2025.md) | Implementação completa de rotas |
| [MIGRACAO_GOOGLE_MAPS.md](MIGRACAO_GOOGLE_MAPS.md) | Migração OSRM → Google Maps |
| [CORRECOES_ERRO_ROTAS.md](docs/CORRECOES_ERRO_ROTAS.md) | Correções de erros de rotas |

### Integrações

| Documento | Descrição |
|-----------|-----------|
| [GOOGLE_ROUTES_SETUP.md](docs/GOOGLE_ROUTES_SETUP.md) | Setup Google Routes API |
| [GOOGLE_MAPS_API_KEYS_SETUP.md](GOOGLE_MAPS_API_KEYS_SETUP.md) | Setup Google Maps API |
| [CONFIGURACAO_API_KEY.md](docs/CONFIGURACAO_API_KEY.md) | Configuração de API Keys |

### Dados e Mapas

| Documento | Descrição |
|-----------|-----------|
| [INTEGRACAO_PISTAS_VOO.md](docs/INTEGRACAO_PISTAS_VOO.md) | Integração de pistas de voo |
| [MIGRACAO_PISTAS_JSON.md](docs/MIGRACAO_PISTAS_JSON.md) | Migração de dados de pistas |
| [MUNICIPIOS_SEM_TAG.md](docs/MUNICIPIOS_SEM_TAG.md) | Municípios sem classificação |

### Interface e UX

| Documento | Descrição |
|-----------|-----------|
| [FEATURE_MODO_VENDAS.md](docs/FEATURE_MODO_VENDAS.md) | Modo vendas no mapa |
| [HOVER_MAPA_MUNICIPIOS.md](docs/doc_efeito_mapa_mouse/HOVER_MAPA_MUNICIPIOS.md) | Efeito hover no mapa |
| [MAPLIBRE_HOVER_IMPLEMENTACAO.md](docs/doc_efeito_houver_estrat/MAPLIBRE_HOVER_IMPLEMENTACAO.md) | Hover com MapLibre |

### Restrições e Controle de Acesso

| Documento | Descrição |
|-----------|-----------|
| [RESTRICOES_EXPORTACAO_VIEWER.md](docs/RESTRICOES_EXPORTACAO_VIEWER.md) | Restrições para usuários viewer |
| [RESUMO_RESTRICOES_EXPORTACAO.md](docs/RESUMO_RESTRICOES_EXPORTACAO.md) | Resumo de restrições |
| [PR_VIEWPORT_SEM_TAG.md](docs/PR_VIEWPORT_SEM_TAG.md) | Viewport sem tag |

---

## 🎯 Fluxos Rápidos

### Novo Build ARM64

```
1. BUILD_ARM64_GUIDE.md (leia se for primeira vez)
2. BUILD_COMMANDS.txt (copie os comandos)
3. BUILD_CHECKLIST.md (marque o progresso)
```

### Setup Inicial do Projeto

```
1. README.md (visão geral)
2. DOCKER_GUIDE.md (configuração Docker)
3. .env (configurar variáveis)
4. docker/scripts/setup.ps1 (executar)
```

### Deploy em Produção

```
1. BUILD_ARM64_GUIDE.md (criar imagem)
2. deploy-to-ec2-ssm.ps1 (fazer deploy)
3. Verificar health check
```

### Adicionar Nova Funcionalidade

```
1. Implementar código
2. Testar localmente
3. BUILD_ARM64_GUIDE.md (build local)
4. BUILD_ARM64_GUIDE.md (build + push)
5. deploy-to-ec2-ssm.ps1 (deploy)
```

---

## 🔍 Pesquisa Rápida

### Preciso fazer build ARM64?
→ [BUILD_ARM64_GUIDE.md](BUILD_ARM64_GUIDE.md) ou [QUICK_BUILD_ARM64.md](QUICK_BUILD_ARM64.md)

### Como configurar Docker?
→ [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

### Como fazer deploy na EC2?
→ [deploy-to-ec2-ssm.ps1](deploy-to-ec2-ssm.ps1) (recomendado) ou [deploy-to-ec2.ps1](deploy-to-ec2.ps1)

### Como funciona o sistema de rotas?
→ [SISTEMA_ROTAS_MULTIMODAL.md](docs/SISTEMA_ROTAS_MULTIMODAL.md)

### Como configurar Google Maps?
→ [GOOGLE_MAPS_API_KEYS_SETUP.md](GOOGLE_MAPS_API_KEYS_SETUP.md)

### Erro no build/deploy?
→ [BUILD_ARM64_GUIDE.md](BUILD_ARM64_GUIDE.md) (seção Troubleshooting)

---

## 📝 Convenções de Documentação

- **📖 Guias Completos**: Explicação detalhada com exemplos
- **⚡ Referências Rápidas**: Comandos essenciais sem explicação
- **✅ Checklists**: Listas de verificação passo a passo
- **🔧 Correções**: Documentação de bugs corrigidos
- **📋 Implementação**: Detalhes técnicos de features

---

## 🔄 Atualização de Documentos

**Última atualização**: 26/11/2025

**Documentos atualizados recentemente**:
- BUILD_ARM64_GUIDE.md (novo)
- QUICK_BUILD_ARM64.md (novo)
- BUILD_CHECKLIST.md (novo)
- BUILD_COMMANDS.txt (novo)
- README.md (atualizado com referência ARM64)

---

**💡 Dica**: Marque este documento nos favoritos do seu editor para acesso rápido!

