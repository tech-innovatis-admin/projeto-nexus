# 🚀 Quick Start - Sistema de Rotas OSRM

## Configuração Rápida (5 minutos)

### 1️⃣ Pré-requisitos
- ✅ Docker instalado e rodando
- ✅ Node.js 18+ instalado
- ✅ Projeto NEXUS clonado

### 2️⃣ Configurar Variável de Ambiente

Adicione ao seu `.env.local`:
```env
OSRM_URL=http://localhost:5000
```

### 3️⃣ Executar Script de Setup

**Windows (PowerShell):**
```powershell
.\scripts\setup-osrm.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/setup-osrm.sh
./scripts/setup-osrm.sh
```

O script automaticamente:
- 📥 Baixa o extrato OSM de São Paulo (~200MB)
- 🐳 Baixa a imagem Docker do OSRM
- 🔧 Processa o grafo de rotas (~5-10min)
- 🚀 Inicia o servidor OSRM na porta 5000

### 4️⃣ Verificar Instalação

**Teste o servidor OSRM:**
```bash
curl http://localhost:5000
```

**Teste a API interna do NEXUS:**
```bash
curl http://localhost:3000/api/rotas/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "services": {
    "osrm": { "status": "online" },
    "routeTest": { "status": "ok" }
  }
}
```

### 5️⃣ Iniciar Aplicação

```bash
npm run dev
```

Acesse: `http://localhost:3000/rotas`

---

## 🎯 Como Usar

1. **Acesse a página de rotas**: `/rotas`
2. **Selecione Polos**: Municípios de origem (com aeroporto/heliponto)
3. **Selecione Periferias**: Municípios de destino
4. **Configure**: Velocidade de voo, preferências de rota
5. **Calcule**: Clique em "Calcular Rota"
6. **Visualize**: Rota aparecerá no mapa com estatísticas

---

## 🔧 Troubleshooting

### Servidor OSRM não inicia
- Verifique se Docker está rodando: `docker ps`
- Verifique se porta 5000 está livre: `netstat -an | findstr 5000`

### Erro "No route found"
- Certifique-se de usar coordenadas dentro de São Paulo
- Verifique se o grafo foi processado corretamente

### Timeout ao calcular rota
- Rota pode estar muito complexa
- Verifique conectividade com servidor OSRM

---

## 📚 Documentação Completa

Para setup avançado, consulte:
- [`docs/OSRM_SETUP.md`](./OSRM_SETUP.md) - Guia completo
- [`README.md`](../README.md) - Arquitetura do projeto

---

## 🆘 Suporte

- 📧 Email: suporte@nexus.innovatis.com.br
- 📱 Issues: GitHub Issues
- 📚 Docs: `docs/`

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀
