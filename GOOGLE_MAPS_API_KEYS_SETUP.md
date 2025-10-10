# 🔑 Configuração de Chaves API Google Maps - Browser vs Server

## 🎯 Problema Identificado

O projeto estava usando uma **única chave API** com restrição por referrer para ambos os ambientes (browser e server), causando erro `REQUEST_DENIED` quando o backend tenta usar APIs como Geocoding e Routes.

**Erro específico:**
```
API keys with referer restrictions cannot be used with this API.
```

## ✅ Solução: Chaves Separadas

> **⚠️ IMPORTANTE:** São **duas chaves físicas diferentes** no Google Cloud Console, não apenas nomes diferentes de variáveis!

### 🏗️ Arquitetura de Chaves

| Ambiente | Variável | Chave GCP | Restrições | Uso |
|----------|----------|-----------|------------|-----|
| **Browser** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Chave A | HTTP Referrers | Mapas interativos, Places API |
| **Server** | `GOOGLE_MAPS_API_KEY` | **Chave B** | IP Address ou None | Geocoding, Routes, Directions |

## 🚀 Passo a Passo para Configuração

### 1. Acesse o Google Cloud Console

1. Vá para: https://console.cloud.google.com/google/maps-apis/overview
2. Selecione seu projeto
3. Vá para **"APIs e Serviços"** → **"Credenciais"**

### 2. Criar Duas Chaves API

#### Chave 1: Browser Key (com restrição por referrer)
1. Clique **"Criar credenciais"** → **"Chave de API"**
2. Edite a chave recém-criada:
   - **Nome**: `NEXUS Browser Key`
   - **Restrições de aplicação**: `HTTP referrers`
     - Adicione seus domínios: `localhost:3000`, `seusite.com`
   - **Restrições de API**: `Restringir chave`
     - ✅ Maps JavaScript API
     - ✅ Places API (se usar)
3. Copie a chave

#### Chave 2: Server Key (sem restrição ou por IP)
1. Clique **"Criar credenciais"** → **"Chave de API"**
2. Edite a chave recém-criada:
   - **Nome**: `NEXUS Server Key`
   - **Restrições de aplicação**: `Nenhuma` (None)
     - OU `Endereços IP` com o IP do seu servidor
   - **Restrições de API**: `Restringir chave`
     - ✅ Geocoding API
     - ✅ Routes API
     - ✅ Directions API
     - ✅ Maps JavaScript API (opcional)
3. Copie a chave

### 3. Ativar APIs Necessárias

Certifique-se de que estas APIs estão **ativadas**:

#### Para Browser:
- ✅ **Maps JavaScript API**

#### Para Server:
- ✅ **Geocoding API** (converte endereços em coordenadas)
- ✅ **Routes API** (cálculo de rotas otimizadas)
- ✅ **Directions API** (rotas terrestres detalhadas)

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` e adicione a nova variável:

```env
# 🔑 Chave existente para BROWSER (frontend)
# - Restrita por HTTP referrers no Google Cloud Console
# - Usada pelo Google Maps JavaScript no cliente
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC9VaVaVaVaVaVaVaVaVaVaVaVaVaVaVaV

# 🔑 Nova chave para SERVER (backend)
# - SEM restrição de referrer no Google Cloud Console
# - Usada pelas APIs de geocoding e routes no backend
GOOGLE_MAPS_API_KEY=AIzaSyB8BbBbBbBbBbBbBbBbBbBbBbBbBbBbBbB

# ⚙️ Outras configurações (mantidas)
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
# ... outras variáveis
```

**Importante:** `GOOGLE_MAPS_API_KEY` deve ser uma **chave diferente** no Google Cloud Console, configurada **sem restrições de HTTP referrers**.

### 5. Verificar Configuração

#### Teste 1: Health Check do Server
```bash
curl http://localhost:3000/api/rotas/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "services": {
    "googleMaps": {
      "available": true,
      "status": "API Key válida"
    }
  },
  "environment": {
    "hasApiKey": true,
    "nodeEnv": "development"
  }
}
```

#### Teste 2: Teste de Geocoding
```bash
curl -X POST http://localhost:3000/api/rotas/google-routes \
  -H "Content-Type: application/json" \
  -d '{
    "origem": {"nome": "João Pessoa", "uf": "PB"},
    "destino": {"nome": "Campina Grande", "uf": "PB"},
    "travelMode": "DRIVE"
  }'
```

## 🔍 Onde Cada Chave é Usada

### Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **Variável**: `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Arquivo**: `src/components/RotaMapa.tsx`
- **Uso**: Inicialização do mapa interativo
- **APIs**: Maps JavaScript API
- **Restrições no GCP**: HTTP referrers obrigatórias

### Server Key (`GOOGLE_MAPS_API_KEY`)
- **Variável**: `process.env.GOOGLE_MAPS_API_KEY`
- **Arquivos**:
  - `src/app/api/rotas/google-routes/route.ts`
  - `src/app/api/rotas/google-routes-optimize/route.ts`
  - `src/app/api/rotas/google-maps/route.ts`
  - `src/app/api/rotas/health/route.ts`
- **Uso**: Geocoding, cálculo de rotas, health checks
- **APIs**: Geocoding API, Routes API, Directions API
- **Restrições no GCP**: Nenhuma (ou por IP do servidor)

## 💰 Custos e Billing

### Verificar Billing
1. No Google Cloud Console: **"Faturamento"** → **"Visão geral"**
2. Certifique-se de que há uma conta de faturamento vinculada
3. **Créditos gratuitos**: Novos usuários recebem $200-300

### Monitoramento de Custos
1. Vá para **"APIs e Serviços"** → **"Painel de controle"**
2. Selecione cada API para ver métricas de uso
3. Configure alertas: **"Faturamento"** → **"Orçamentos e alertas"**

### Custos por API (2025)

| API | Gratuito | Após |
|-----|----------|------|
| **Maps JavaScript** | 28.500 carregamentos/mês | $7/1.000 carregamentos |
| **Geocoding** | 40.000 requisições/mês | $5/1.000 requisições |
| **Routes** | 10.000 requisições/mês | $5-20/1.000 requisições |
| **Directions** | 40.000 requisições/mês | $5/1.000 requisições |

## 🧪 Troubleshooting

### Erro: "API keys with referer restrictions cannot be used with this API"
- **Causa**: Usando chave do browser no server
- **Solução**: Configure `GOOGLE_MAPS_API_KEY` sem restrições de referrer

### Erro: "The provided API key is invalid"
- **Causa**: API não ativada ou chave incorreta
- **Solução**: Verifique ativação das APIs e copie a chave completa

### Erro: 403 Permission Denied
- **Causa**: Billing não configurado
- **Solução**: Vincule conta de faturamento ao projeto

### Erro: 429 Rate Limit Exceeded
- **Causa**: Muitas requisições em pouco tempo
- **Solução**: Aguarde e reduza frequência (limite: 60/min por IP)

## 🔐 Segurança

### Práticas Recomendadas
1. **Nunca commite** chaves API no Git
2. Use **variáveis de ambiente** (não hardcoded)
3. **Restrinja por API**: Cada chave só acessa APIs necessárias
4. **Restrinja por domínio/IP**: Quando possível
5. **Monitore uso** regularmente
6. **Roteirize chaves** a cada 90 dias

### Rotações de Chave
1. Crie nova chave com permissões idênticas
2. Atualize `.env.local` com nova chave
3. Teste funcionamento
4. Revogue chave antiga
5. Atualize variáveis em produção

## 📞 Suporte

Se o problema persistir:

1. **Execute health check**: `/api/rotas/health`
2. **Verifique logs** no console do servidor
3. **Teste APIs individualmente** no Google Cloud Console
4. **Confirme billing** está ativo
5. **Envie logs detalhados** para suporte

---

**✅ Checklist Final**

- [ ] **Duas chaves físicas criadas** no Google Cloud Console (não apenas variáveis!)
- [ ] Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) com restrição por HTTP referrers
- [ ] **Server Key separada** (`GOOGLE_MAPS_API_KEY`) sem restrição de referrer
- [ ] APIs necessárias ativadas em ambas as chaves:
  - [ ] Geocoding API (apenas na chave server)
  - [ ] Routes API (apenas na chave server)
  - [ ] Directions API (apenas na chave server)
  - [ ] Maps JavaScript API (em ambas as chaves)
- [ ] Arquivo `.env.local` com ambas as variáveis
- [ ] Billing vinculado ao projeto GCP
- [ ] Health check (`/api/rotas/health`) retornando status "ok"
- [ ] Teste de geocoding funcionando sem erro REQUEST_DENIED

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀
