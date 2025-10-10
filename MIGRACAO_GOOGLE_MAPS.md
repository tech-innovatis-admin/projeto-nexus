# 🗺️ Migração OSRM → Google Maps - Sistema de Rotas NEXUS

## ✅ **Migração Concluída com Sucesso!**

### **📋 Resumo das Alterações**

O sistema de rotas do NEXUS foi **completamente migrado** do OSRM para Google Maps API, implementando a lógica de transporte diferenciada:

- **Polo → Polo**: ✈️ **Voo** (calculado no frontend usando distância Haversine)
- **Polo → Periferia**: 🚗 **Carro** (Google Maps Directions API)
- **Periferia → Polo**: 🚗 **Carro** (Google Maps Directions API)  
- **Periferia → Periferia**: 🚗 **Carro** (Google Maps Directions API)

---

## 🔧 **Arquivos Criados/Modificados**

### **🆕 Arquivos Novos:**
1. **`/api/rotas/google-maps/route.ts`** - Nova API para Google Maps
2. **`MIGRACAO_GOOGLE_MAPS.md`** - Este documento

### **📝 Arquivos Modificados:**
1. **`src/utils/routingUtils.ts`** - Lógica atualizada para Google Maps
2. **`src/types/routing.ts`** - Adicionada `alturaVooMetros`
3. **`src/hooks/useRotas.ts`** - Configuração padrão atualizada
4. **`src/components/routing/ConfiguracaoRotas.tsx`** - Interface de altura do voo
5. **`src/app/api/rotas/health/route.ts`** - Health check do Google Maps
6. **`.env`** - Removido `OSRM_URL`, mantido `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## 🎯 **Lógica de Roteamento Implementada**

### **Exemplo com Municípios da Paraíba:**

```
João Pessoa (Polo) ✈️ Campina Grande (Polo)
    ↓ 🚗
Queimadas (Periferia) 🚗 Fagundes (Periferia)
    ↓ 🚗
Lagoa Seca (Periferia) 🚗 Santa Rita (Periferia)
    ↓ 🚗
Alhandra (Periferia) 🚗 Pitimbu (Periferia)
```

### **Algoritmo de Decisão:**
1. **Identificar tipos de município** (polo/periferia)
2. **Aplicar modal correto**:
   - Polo → Polo = Voo (cálculo Haversine + velocidade configurada)
   - Qualquer outro = Google Maps Directions API
3. **Otimizar rotas com TSP** quando habilitado
4. **Calcular estatísticas completas**

---

## 🚀 **Como Usar**

### **1. Configurar API Key do Google Maps**
Certifique-se que o arquivo `.env` contém:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_api_key_real_aqui
```

### **2. Testar Health Check**
```bash
curl http://localhost:3000/api/rotas/health
```
Deve retornar: `{"status":"ok","services":{"googleMaps":{"available":true}}}`

### **3. Testar API de Rotas**
```bash
curl -X POST http://localhost:3000/api/rotas/google-maps \
  -H "Content-Type: application/json" \
  -d '{
    "origem": {
      "codigo": "2507507",
      "nome": "João Pessoa",
      "uf": "PB",
      "coordenadas": {"lat": -7.1195, "lng": -34.8450},
      "tipo": "polo"
    },
    "destino": {
      "codigo": "2513703", 
      "nome": "Queimadas",
      "uf": "PB",
      "coordenadas": {"lat": -7.3554, "lng": -35.8959},
      "tipo": "periferia"
    },
    "tipoTransporte": "driving"
  }'
```

### **4. Usar Interface Web**
1. Acesse `http://localhost:3000/rotas`
2. Selecione municípios polos e periferias
3. Configure velocidade e altura do voo
4. Clique em "Calcular Rota"
5. Visualize resultado no painel lateral

---

## 📊 **Novas Funcionalidades**

### **🚁 Configuração de Voo Expandida**
- **Velocidade**: 100-300 km/h (padrão: 180 km/h)
- **Altura**: 100-1000 metros (padrão: 300m)
- **Presets rápidos** para ambos os valores

### **🗺️ API Google Maps Completa**
- **Cache inteligente**: 1 hora de TTL
- **Rate limiting**: 100 req/min por IP
- **Validação robusta**: Coordenadas, tipos, transportes
- **Instruções em português**: Turn-by-turn traduzidas
- **Geometria decodificada**: Polyline → coordenadas

### **🔍 Health Check Aprimorado**
- Teste real de rota SP→RJ
- Verificação de API Key
- Monitoramento de performance
- Status detalhado de serviços

---

## 🎯 **Benefícios da Migração**

### **✅ Vantagens:**
- **Dados atualizados**: Google Maps sempre atualizado
- **Simplicidade**: Sem necessidade de servidor OSRM local
- **Confiabilidade**: Infraestrutura Google robusta
- **Precisão**: Rotas reais com trânsito considerado
- **Manutenção**: Zero configuração de servidor

### **💰 Custos:**
- **Google Maps API**: ~$5/1000 requests
- **OSRM era gratuito**, mas exigia infraestrutura própria

---

## 🛠️ **Configuração de Produção**

### **1. Obter API Key do Google Maps**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie/selecione um projeto
3. Ative a **Directions API**
4. Crie uma API Key
5. Configure restrições (domínios, IPs)

### **2. Configurar Cotas**
- **Requests/dia**: Configure baseado no uso esperado
- **Requests/minuto**: Ajuste rate limiting se necessário
- **Monitoramento**: Configure alertas de uso

### **3. Otimizações**
- **Cache**: Aumente TTL se necessário (atual: 1h)
- **Rate Limiting**: Ajuste limites por usuário
- **Compressão**: Habilite gzip para responses

---

## 🧪 **Testes Realizados**

### **✅ APIs Testadas:**
- [x] `/api/rotas/google-maps` - Criação de rotas terrestres
- [x] `/api/rotas/health` - Health check Google Maps
- [x] Validação de entrada (coordenadas, tipos)
- [x] Rate limiting e cache
- [x] Tradução de instruções

### **✅ Frontend Testado:**
- [x] Componente `ConfiguracaoRotas` com altura do voo
- [x] Hook `useRotas` com nova lógica
- [x] Função `calcularRotaTerrestre` atualizada
- [x] Cálculo de voos no frontend mantido

### **✅ Integração Testada:**
- [x] Fluxo completo polo→periferia
- [x] Otimização TSP mantida
- [x] Estatísticas de rota corretas
- [x] Cache funcionando

---

## 🚨 **Troubleshooting**

### **❌ "API Key não configurada"**
- Verifique `.env`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...`
- Reinicie o servidor Next.js após mudanças

### **❌ "OVER_QUERY_LIMIT"**
- Verifique cotas no Google Cloud Console
- Aumente limites ou otimize uso do cache

### **❌ "REQUEST_DENIED"**
- Verifique restrições da API Key
- Confirme que Directions API está ativada

### **❌ "Rotas entre polos devem ser voo"**
- Comportamento correto! Polo→Polo usa cálculo de voo
- Use `/api/rotas/google-maps` apenas para rotas terrestres

---

## 📈 **Próximos Passos**

### **Fase 2: Visualização Avançada**
- [ ] Linha verde no mapa para rotas terrestres
- [ ] Linha azul tracejada para voos
- [ ] Animação de percurso da rota
- [ ] Marcadores personalizados

### **Fase 3: Otimizações**
- [ ] Cache em Redis para produção
- [ ] Compressão de geometrias
- [ ] Paralelização de cálculos
- [ ] Implementar Web Workers

### **Fase 4: Analytics**
- [ ] Métricas de uso das rotas
- [ ] Dashboard de performance
- [ ] Relatórios de custos API
- [ ] Alertas automáticos

---

## 🎊 **Conclusão**

A migração para Google Maps foi **100% bem-sucedida!** O sistema agora opera com:

- ✅ **Lógica de transporte diferenciada** implementada
- ✅ **Performance otimizada** com cache e rate limiting  
- ✅ **Interface aprimorada** com configuração de altura de voo
- ✅ **APIs robustas** com validação e tratamento de erros
- ✅ **Documentação completa** para manutenção futura

**O sistema está pronto para produção!** 🚀

---

**Data**: 6 de outubro de 2025  
**Versão**: 2.0.0 (Google Maps)  
**Status**: ✅ **CONCLUÍDO E TESTADO**