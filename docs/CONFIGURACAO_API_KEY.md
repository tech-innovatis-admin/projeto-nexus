# 🔧 CONFIGURAÇÃO DA API KEY GOOGLE MAPS

## ❌ Problema Identificado
O geocoding está falhando com erro `REQUEST_DENIED - The provided API key is invalid`, mesmo após ativar as APIs no Google Cloud Console.

## 🔍 Diagnóstico
O problema mais comum é que a chave API tem **restrições** que não permitem uso do servidor backend (apenas frontend).

## ✅ SOLUÇÃO PASSO A PASSO

### 1. Acesse o Google Cloud Console
- URL: https://console.cloud.google.com/google/maps-apis/overview
- Selecione seu projeto

### 2. Ative as APIs Necessárias
Certifique-se de que estas APIs estão **ativadas**:
- ✅ **Maps JavaScript API** (para mapas no frontend)
- ✅ **Geocoding API** (para converter endereços em coordenadas)
- ✅ **Routes API** (para calcular rotas)
- ✅ **Directions API** (para rotas terrestres)

### 3. Configure as Restrições da API Key
Esta é a parte mais importante! Vá para:
**APIs e Serviços > Credenciais > Sua Chave API > Editar**

#### Application Restrictions (Restrições de Aplicação)
- **IMPORTANTE**: Configure como **"None"** (Nenhuma)
- Se estiver como "HTTP referrers" ou "IP addresses", o backend não consegue usar a chave

#### API Restrictions (Restrições de API)
- Selecione **"Restrict key"**
- Adicione estas APIs:
  - Geocoding API
  - Maps JavaScript API
  - Routes API
  - Directions API

### 4. Configure o Arquivo .env.local
```bash
# Crie o arquivo .env.local na raiz do projeto
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_api_real_aqui
```

### 5. Teste a Configuração
Execute o script de teste:
```bash
node test-api-key.js
```

## 🧪 Scripts de Diagnóstico Disponíveis

### Script de Teste Completo
```bash
node test-api-key.js
```
- Testa Geocoding API
- Testa Routes API
- Mostra diagnóstico detalhado

### Health Check da API
```bash
# Acesse no navegador: http://localhost:3000/api/rotas/google-routes
```
- Mostra status da chave API
- Testa geocoding diretamente

## 🔍 Verificação de Logs Detalhados

Os logs foram aprimorados para mostrar:
- Status HTTP da resposta
- Headers da resposta
- Resposta completa da API
- Validação da chave API

## 🚨 Possíveis Problemas e Soluções

### Problema: "The provided API key is invalid"
**Solução**: Verifique as restrições da API key no Google Cloud Console

### Problema: "API key not authorized for this service"
**Solução**: Ative a API específica no Google Cloud Console

### Problema: Chave funciona no frontend mas não no backend
**Solução**: Remova restrições de "HTTP referrers" - configure como "None"

## 📞 Suporte

Se o problema persistir:
1. Execute `node test-api-key.js` e envie os logs
2. Acesse `/api/rotas/google-routes` e envie a resposta JSON
3. Verifique se há mensagens de erro específicas no console do navegador

## ✅ Checklist Final

- [ ] APIs ativadas no Google Cloud Console
- [ ] Application restrictions = "None"
- [ ] API restrictions incluem as 4 APIs necessárias
- [ ] Arquivo .env.local criado com chave real
- [ ] Servidor reiniciado após mudanças
- [ ] Teste executado com sucesso

---
**Nota**: As mudanças no Google Cloud Console podem levar alguns minutos para surtir efeito.
