# 🗺️ Configuração do Google Routes API - NEXUS

Este guia explica como configurar a **Google Routes API** para o sistema de otimização de rotas multimodal do NEXUS.

## 📋 Pré-requisitos

- Conta Google Cloud Platform (GCP)
- Método de pagamento configurado (necessário mesmo para uso gratuito)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com/)

## 🚀 Passo a Passo

### 1. Criar ou Selecionar um Projeto no GCP

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Clique no seletor de projetos no topo
3. **Opção A**: Crie um novo projeto
   - Clique em "Novo Projeto"
   - Nome sugerido: `NEXUS-Rotas` ou similar
   - Clique em "Criar"
4. **Opção B**: Selecione um projeto existente

### 2. Ativar o Billing (Faturamento)

1. No menu lateral, vá em **"Faturamento"**
2. **Se não tiver conta de faturamento**:
   - Clique em "Vincular conta de faturamento"
   - Siga o processo para adicionar um cartão de crédito
   - **Importante**: A Google oferece $200 em créditos gratuitos para novos usuários
3. **Se já tiver**: Vincule o projeto à conta de faturamento existente

### 3. Ativar a Routes API

1. No menu lateral, vá em **"APIs e serviços"** → **"Biblioteca"**
2. Na barra de busca, digite: `Routes API`
3. Clique em **"Routes API"** nos resultados
4. Clique no botão **"Ativar"**
5. Aguarde a ativação (geralmente leva alguns segundos)

### 4. Criar uma API Key

1. No menu lateral, vá em **"APIs e serviços"** → **"Credenciais"**
2. Clique em **"Criar credenciais"** → **"Chave de API"**
3. Uma nova chave será criada e exibida
4. **IMPORTANTE**: Copie a chave imediatamente e armazene com segurança

### 5. Restringir a API Key (Segurança) 🔒

**Muito importante para proteger contra uso indevido!**

1. Na tela de credenciais, clique no ícone de **lápis** ao lado da chave criada
2. Em **"Restrições de API"**:
   - Selecione: **"Restringir chave"**
   - Marque apenas: **"Routes API"**
   - Salve
3. Em **"Restrições de aplicação"** (opcional mas recomendado):
   - **Para produção**: Selecione "Referenciadores HTTP" e adicione seu domínio
   - **Para desenvolvimento local**: Selecione "Endereços IP" e adicione o IP do servidor
   - **Ou**: Deixe sem restrição temporariamente (APENAS em desenvolvimento)

### 6. Configurar no NEXUS

#### Adicionar ao arquivo `.env.local`:

```env
# Google Maps API (usada para Routes API e Maps JavaScript API)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...suaChaveAqui
```

**Nota:** A mesma chave API é usada para ambas as APIs do Google:
- **Google Routes API** (servidor) - para cálculo de rotas
- **Google Maps JavaScript API** (cliente) - para exibição de mapas

#### Verificar instalação:

```bash
# 1. Reiniciar o servidor de desenvolvimento
npm run dev

# 2. Testar health check
curl http://localhost:3000/api/rotas/google-routes-optimize
# Deve retornar: {"status":"ok","service":"Google Routes Optimization","apiConfigured":true,...}

# 3. Testar health check de rotas individuais
curl http://localhost:3000/api/rotas/google-routes
# Deve retornar: {"status":"ok","service":"Google Routes Directions","apiConfigured":true,...}
```

## 💰 Custos e Limites

### Tier Gratuito (Essentials)
- **10.000 requisições/mês grátis**
- Após isso: **$5 por 1.000 requisições** (primeira faixa)

### Tier Avançado (Advanced - 11-25 waypoints)
- Custo maior para rotas com mais de 10 waypoints intermediários
- Consulte [página de preços](https://mapsplatform.google.com/pricing/)

### Otimizações para Reduzir Custos

1. **Cache implementado**: Rotas idênticas são armazenadas por 7 dias
2. **Rate limiting**: Máximo de 60 requisições/minuto por IP
3. **Field mask**: Solicita apenas os campos necessários
4. **Agrupamento**: Otimiza múltiplas requisições em uma só quando possível

### Monitoramento de Uso

1. No Google Cloud Console, vá em **"APIs e serviços"** → **"Painel de controle"**
2. Selecione **"Routes API"** para ver métricas de uso
3. Configure alertas de billing:
   - Vá em **"Faturamento"** → **"Orçamentos e alertas"**
   - Crie um alerta (ex: notificar ao atingir $50)

## 🧪 Testando a Integração

### Teste 1: Otimização de Sequência

```bash
curl -X POST http://localhost:3000/api/rotas/google-routes-optimize \
  -H "Content-Type: application/json" \
  -d '{
    "start": {
      "coordenadas": {"lat": -7.1195, "lng": -34.845},
      "codigo": "2500700",
      "nome": "João Pessoa",
      "uf": "PB",
      "tipo": "polo"
    },
    "waypoints": [
      {
        "coordenadas": {"lat": -7.2306, "lng": -35.8811},
        "codigo": "2504009",
        "nome": "Campina Grande",
        "uf": "PB",
        "tipo": "polo"
      }
    ],
    "mode": "closed"
  }'
```

### Teste 2: Rota Individual

```bash
curl -X POST http://localhost:3000/api/rotas/google-routes \
  -H "Content-Type: application/json" \
  -d '{
    "origem": {"lat": -7.1195, "lng": -34.845},
    "destino": {"lat": -7.2306, "lng": -35.8811},
    "travelMode": "DRIVE"
  }'
```

## ❓ Troubleshooting

### Erro: "API Key não configurada"
- Verifique se `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está no `.env.local`
- Reinicie o servidor após adicionar a variável

### Erro: 403 Permission Denied
- Verifique se a Routes API está ativada no projeto
- Confirme se o billing está configurado
- Revise as restrições da API Key

### Erro: 429 Rate Limit
- Aguarde 1 minuto e tente novamente
- Verifique o rate limiting no código (60 req/min)

### Erro: 400 Invalid Request
- Verifique se o `X-Goog-FieldMask` está configurado
- Confirme que as coordenadas estão no formato correto (lat/lng)

## 📚 Recursos Adicionais

- [Documentação oficial Routes API](https://developers.google.com/maps/documentation/routes)
- [Preços e limites](https://mapsplatform.google.com/pricing/)
- [Best practices](https://developers.google.com/maps/documentation/routes/best-practices)
- [Exemplos de código](https://github.com/googlemaps/google-maps-services-js)

## 🔐 Segurança

### Práticas recomendadas:
1. **Nunca** commitar a API Key no git
2. Use `.env.local` para desenvolvimento
3. Em produção, use variáveis de ambiente do servidor (Vercel, Railway, etc.)
4. Restrinja a chave por API e por domínio/IP
5. Monitore o uso regularmente
6. Configure alertas de custo no GCP

### Rotação de chaves:
- Recomenda-se rotacionar a API Key a cada 90 dias
- Mantenha 2 chaves ativas durante a transição
- Revogue chaves antigas após migração completa

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀

