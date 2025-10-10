# 🚁 Sistema de Rotas Multimodal - NEXUS

## 📋 Visão Geral

O Sistema de Rotas Multimodal é uma funcionalidade avançada do NEXUS que permite calcular, otimizar e visualizar rotas entre municípios brasileiros combinando **transporte aéreo** (helicóptero/avião) e **transporte terrestre** (carro), respeitando as infraestruturas reais de cada município.

### Conceitos Fundamentais

**Municípios Polo**:
- Municípios com maior infraestrutura
- **Possuem pistas de voo** (aeroportos/heliportos)
- Podem ser alcançados por **via aérea** ou terrestre
- Servem como "hubs" regionais

**Municípios Periferia**:
- Municípios menores ao redor dos polos
- **Não possuem pistas de voo**
- Só podem ser alcançados por **via terrestre**
- Vinculados a um polo principal

### Regras de Negócio

1. **Polo → Polo**: Sempre usa **VOO** (linha reta geodésica)
2. **Polo → Periferia**: Sempre usa **TERRESTRE** (estradas reais)
3. **Periferia → Periferia**: Sempre usa **TERRESTRE** (estradas reais)
4. **Periferia → Polo**: Sempre usa **TERRESTRE** (estradas reais)

## 🎯 Funcionalidades

### ✅ Implementadas

#### 1. Seleção Interativa de Municípios
- ✅ Filtro por estado (nome completo)
- ✅ Seleção múltipla de polos
- ✅ Seleção múltipla de periferias
- ✅ Contadores dinâmicos de seleção
- ✅ Interface responsiva e intuitiva

#### 2. Otimização Inteligente de Rotas

**Google Routes API Integration**:
- ✅ Otimização automática da ordem de visita (TSP)
- ✅ Cálculo de rotas terrestres reais (não linha reta)
- ✅ Instruções turn-by-turn em português
- ✅ Geometrias precisas seguindo estradas

**Algoritmos**:
- ✅ TSP entre polos (otimiza ordem de voos)
- ✅ TSP local para periferias de cada polo
- ✅ Fallback haversine se API indisponível

#### 3. Configuração Avançada
- ✅ Velocidade média de voo ajustável (150-270 km/h)
- ✅ Presets rápidos (150, 180, 220, 270 km/h)
- ✅ Toggle de otimização de polos
- ✅ Toggle de otimização de periferias
- ✅ Limite de distância terrestre máxima (opcional)

#### 4. Visualização no Mapa
- ✅ Marcadores numerados sequencialmente
- ✅ Linhas azuis tracejadas para voos
- ✅ Linhas verdes sólidas para rotas terrestres
- ✅ Popups informativos nos marcadores
- ✅ Ajuste automático de viewport
- ✅ Integração com MapLibre GL

#### 5. Painel de Detalhes
- ✅ Estatísticas gerais (distância total, tempo total)
- ✅ Breakdown por modal (aéreo vs terrestre)
- ✅ Lista detalhada de trechos
- ✅ Instruções de navegação completas
- ✅ Exportação em JSON

#### 6. Performance e Cache
- ✅ Cache de rotas otimizadas (7 dias)
- ✅ Cache de rotas individuais (24h)
- ✅ Rate limiting (60 req/min por IP)
- ✅ Field masks otimizados (reduz dados transferidos)
- ✅ Fallback para cálculos offline

### 🔄 Em Desenvolvimento

- ⏳ Exportação de relatórios em PDF
- ⏳ Exportação de planilhas em XLSX
- ⏳ Comparação de cenários (diferentes velocidades)
- ⏳ Salvamento de rotas favoritas
- ⏳ Histórico de rotas calculadas

## 🏗️ Arquitetura Técnica

### Backend (API Routes)

#### `/api/rotas/google-routes-optimize`
**Função**: Otimiza ordem de waypoints usando Google Routes API

**Entrada**:
```typescript
{
  start: WaypointInfo,
  waypoints: WaypointInfo[],
  mode: 'open' | 'closed', // Aberto (não volta) ou Fechado (volta ao início)
  travelMode?: 'DRIVE' | 'WALK',
  routingPreference?: 'TRAFFIC_AWARE'
}
```

**Saída**:
```typescript
{
  success: boolean,
  order: number[], // Índices otimizados
  totalDistanceKm: number,
  totalDurationMin: number
}
```

**Features**:
- ✅ Cache com TTL de 7 dias
- ✅ Limpa cache expirado automaticamente
- ✅ Suporta até 25 waypoints
- ✅ Tratamento de erros específicos (400, 403, 429)

#### `/api/rotas/google-routes`
**Função**: Calcula rota individual com instruções detalhadas

**Entrada**:
```typescript
{
  origem: Coordenada,
  destino: Coordenada,
  waypoints?: Coordenada[],
  travelMode?: 'DRIVE'
}
```

**Saída**:
```typescript
{
  success: boolean,
  distanciaKm: number,
  tempoMinutos: number,
  geometria: [lng, lat][], // Polyline decodificada
  instrucoes: InstrucaoRota[],
  metadados: {...}
}
```

**Features**:
- ✅ Cache com TTL de 24 horas
- ✅ Rate limiting (60 req/min)
- ✅ Tradução de manobras para português
- ✅ Decodificação de polylines Google
- ✅ Timeout de 15 segundos

### Frontend (Components & Hooks)

#### Hook `useRotas`
**Local**: `src/hooks/useRotas.ts`

**Responsabilidades**:
- Gerenciamento de estado das rotas
- Seleção/desseleção de polos e periferias
- Cálculo de rotas completas
- Vinculação de periferias aos polos
- Cache em memória

**Estado**:
```typescript
{
  polosSelecionados: MunicipioPolo[],
  periferiasSelecionadas: MunicipioPeriferia[],
  rotaAtual: RotaCompleta | null,
  configuracao: ConfiguracaoRota,
  carregando: boolean,
  erro: string | null,
  cacheRotas: Map<string, RotaCompleta>
}
```

#### Componente `RotasComponent`
**Local**: `src/components/routing/RotasComponent.tsx`

**Features**:
- Interface de seleção de municípios
- Filtros por estado
- Botão "Calcular Rota"
- Botão "Limpar Seleções"
- Feedback visual de loading
- Mensagens de erro

#### Componente `DetalhesRotaPanel`
**Local**: `src/components/routing/DetalhesRotaPanel.tsx`

**Abas**:
1. **Resumo**: Estatísticas gerais e breakdown por modal
2. **Trechos**: Lista expansível de todos os trechos
3. **Instruções**: Navegação turn-by-turn completa

**Ações**:
- Download em JSON
- Exportar relatório (futuro)
- Fechar painel

#### Componente `RotaMapVisualization`
**Local**: `src/components/routing/RotaMapVisualization.tsx`

**Responsabilidades**:
- Renderiza rotas no mapa MapLibre GL
- Cria marcadores numerados
- Adiciona linhas de voo e terrestres
- Gerencia popups interativos
- Ajusta viewport automaticamente

### Utilitários

#### `routingUtils.ts`
**Funções principais**:
- `calcularDistanciaHaversine()`: Distância geodésica
- `calcularTempoVoo()`: Tempo baseado em velocidade
- `criarTrechoVoo()`: Cria trecho aéreo
- `calcularRotaTerrestre()`: Integra com Google Routes
- `otimizarSequenciaWaypoints()`: Otimização via API
- `calcularEstatisticasRota()`: Agrega métricas
- `formatarTempo()`: Formata minutos em horas
- `formatarDistancia()`: Formata km

#### `routingOptimization.ts` (NOVO)
**Funções principais**:
- `calcularRotaMultimodal()`: Orquestração completa
- `otimizarSequenciaPolos()`: TSP entre polos
- `otimizarRotaPeriferias()`: TSP local
- `vincularPeriferiaAosPolo()`: Agrupamento inteligente
- `exportarRotaJSON()`: Serialização estruturada

## 📊 Fluxo de Cálculo de Rota

```
1. SELEÇÃO
   └─> Usuário seleciona polos e periferias

2. VINCULAÇÃO
   └─> Sistema vincula periferias aos polos mais próximos

3. OTIMIZAÇÃO DE POLOS (se habilitado)
   └─> Google Routes API otimiza ordem de visita entre polos
   └─> Cria trechos de VOO entre polos

4. OTIMIZAÇÃO DE PERIFERIAS (para cada polo)
   └─> Google Routes API otimiza ordem de periferias
   └─> Calcula rotas TERRESTRES reais:
       ├─> Polo → Primeira Periferia
       ├─> Periferia → Periferia (sequencial)
       └─> Última Periferia → Polo

5. AGREGAÇÃO
   └─> Combina todos os trechos (voos + terrestres)
   └─> Calcula estatísticas finais

6. VISUALIZAÇÃO
   └─> Renderiza no mapa com numeração sequencial
   └─> Exibe painel de detalhes
```

## 🎨 Interface de Usuário

### Página `/rotas`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Navbar                                              │
├────────┬────────────────────────────────────────────┤
│        │ Header: "Otimização de Rotas"              │
│ Side   ├────────────────────────────────────────────┤
│ bar    │                                            │
│        │ ┌───────────┐ ┌───────────────────────────┤
│        │ │           │ │                           │
│        │ │ Painel de │ │                           │
│        │ │ Controle  │ │         MAPA              │
│        │ │           │ │      (MapLibre GL)        │
│        │ │  - Polos  │ │                           │
│        │ │  - Perif. │ │    [Visualização de       │
│        │ │  - Config │ │     rotas numeradas]      │
│        │ │  - Botões │ │                           │
│        │ │           │ │                           │
│        │ └───────────┘ └───────────────────────────┤
├────────┴────────────────────────────────────────────┤
│ Footer                                              │
└─────────────────────────────────────────────────────┘
```

### Painel de Controle (430px → 460px largura)

**Seções**:
1. **Seleção de Polos** (expansível)
   - Filtro por estado
   - Lista com checkboxes
   - Contador: "Polos (X - Total)"

2. **Seleção de Periferias** (expansível)
   - Filtro por estado
   - Lista com checkboxes
   - Contador: "Periferias (X - Total)"

3. **Configuração** (expansível)
   - Velocidade de voo
   - Opções de otimização
   - Limites de distância

4. **Ações**
   - Botão "Calcular Rota" (azul)
   - Botão "Limpar Seleções" (vermelho)

### Overlay de Informações (Canto superior direito do mapa)

**Quando há rota ativa**:
- Nome da rota
- Distância total
- Tempo total
- Trechos aéreos
- Trechos terrestres
- Botão "Fechar"
- Botão "Recentralizar"

## 💡 Exemplos de Uso

### Caso 1: Rota simples (1 polo + 3 periferias)

**Entrada**:
- Polo: Campina Grande (PB)
- Periferias: Lagoa Seca, Massaranduba, Queimadas

**Processamento**:
1. Vincula as 3 periferias ao polo Campina Grande
2. Otimiza ordem de visita nas periferias
3. Calcula rotas terrestres:
   - Campina Grande → Lagoa Seca
   - Lagoa Seca → Queimadas
   - Queimadas → Massaranduba
   - Massaranduba → Campina Grande

**Saída**:
- 4 trechos terrestres
- 0 trechos aéreos
- Tempo total: ~2h30min
- Distância total: ~85km

### Caso 2: Rota complexa (3 polos + 8 periferias)

**Entrada**:
- Polos: João Pessoa, Campina Grande, Patos
- Periferias: 8 municípios menores

**Processamento**:
1. Otimiza ordem entre polos (TSP)
2. Cria voos entre polos
3. Para cada polo, otimiza suas periferias
4. Calcula rotas terrestres locais

**Saída**:
- 2 trechos de voo (entre os 3 polos)
- 12+ trechos terrestres
- Tempo total: ~8h (incluindo voos)
- Distância total: ~450km

## 🔧 Manutenção e Troubleshooting

### Problemas Comuns

#### 1. "API Key não configurada"
**Causa**: Falta `GOOGLE_ROUTES_API_KEY` no `.env.local`
**Solução**: Adicione a chave e reinicie o servidor

#### 2. Rotas não sendo calculadas
**Causa**: Possíveis:
- Limite de requisições atingido
- Coordenadas inválidas
- API Key expirada/restrita

**Solução**:
1. Verifique console do navegador
2. Verifique logs do servidor
3. Teste health check: `/api/rotas/google-routes-optimize`

#### 3. Mapa não mostra rotas
**Causa**: 
- Componente `RotaMapVisualization` não montado
- Mapa não registrado no `mapRegistry`

**Solução**:
1. Verifique console: "Mapa pronto"
2. Force refresh do mapa
3. Limpe cache do navegador

### Monitoramento

**Logs importantes**:
```
🚀 [useRotas] Iniciando cálculo de rota otimizada...
🔗 [Otimização] Periferias vinculadas aos polos
🎯 [Otimização] Otimizando sequência de N polos...
✅ [Otimização] Sequência otimizada: [...]
✈️ [Otimização] Voo: Polo A → Polo B (XXkm)
🚗 [routingUtils] Calculando rota terrestre: X → Y
✅ [routingUtils] Rota calculada: XXkm, YYmin
```

**Métricas de performance**:
- Tempo médio de otimização: 2-5 segundos
- Tempo de cálculo por trecho terrestre: 0.5-2 segundos
- Taxa de sucesso de cache: >80%

## 📚 Recursos e Referências

- [Google Routes API Docs](https://developers.google.com/maps/documentation/routes)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js-docs/)
- [Turf.js (operações geoespaciais)](https://turfjs.org/)
- [TSP (Traveling Salesman Problem)](https://en.wikipedia.org/wiki/Travelling_salesman_problem)

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀

