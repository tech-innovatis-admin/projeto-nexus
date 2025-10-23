# NEXUS – Plataforma de Produtos e Dados Municipais

> Visualização geoespacial, análise de dados e insights estratégicos para municípios brasileiros.

## Índice
1. [Visão Geral](#visão-geral)
2. [Principais Funcionalidades](#principais-funcionalidades)
3. [Arquitetura](#arquitetura)
4. [Arquitetura Avançada: Resolução de Remount-Triggered Fetching](#-arquitetura-avançada-resolução-de-remount-triggered-fetching)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Tecnologias Utilizadas](#tecnologias-utilizadas)
7. [Configuração do Ambiente](#configuração-do-ambiente)
8. [Scripts NPM](#scripts-npm)
9. [Visualização em Dispositivos Móveis](#visualização-em-dispositivos-móveis)
10. [Fluxo da Aplicação](#fluxo-da-aplicação)
11. [Contribuindo](#contribuindo)
12. [Licença](#licença)

---

## Visão Geral
O **NEXUS** é uma plataforma web desenvolvida pela *Data Science Team – Innovatis MC* que oferece uma visão unificada de dados municipais, com ênfase em **planos diretores**, **produtos** e **serviços** relacionados aos municípios do Brasil. Utilizando mapas interativos, a plataforma possibilita que a Diretoria de Estratégia e Mercado tome decisões baseadas em dados atualizados e confiáveis.

---

## Principais Funcionalidades

### 🎯 **Sistema de Autenticação**
- **Login Seguro** com hash bcryptjs e JWT tokens
- **Controle de Plataformas** (NEXUS, SAEP, etc.)
- **Middleware de Proteção** para rotas `/mapa` e `/estrategia`
- **Logout Automático** com limpeza de sessão

### 🗺️ **Mapa Interativo Avançado**
- **Visualização de Camadas Temáticas**:
  - Municípios (base demográfica, política e produtos)
  - Parceiros institucionais com marcadores customizados
  - Dados de pistas de voo por município com coordenadas precisas (latitude/longitude)
- **Controles Interativos**: Zoom, pan, camadas toggleáveis
- **Destaque Inteligente**: Animações de fade-in/fade-out
- **Popups Informativos**: Dados demográficos, políticos e produtos
- **Busca Inteligente**: Autocomplete com normalização de acentos
- **Ferramenta de Raio**: Análise de cobertura de valores por área geográfica

### 🎯 **Modo Vendas - Análise de Oportunidades**
O **Modo Vendas** permite aos usuários identificar rapidamente quais produtos podem ser vendidos para um município específico, baseado em regras de elegibilidade automática.

#### **Como Funciona:**
1. **Seleção de Município**: Escolha um município no mapa ou busca
2. **Ativação**: Clique no botão "O que vender?" na barra de ações
3. **Filtragem Automática**: A lista de produtos é filtrada automaticamente
4. **Análise**: Produtos elegíveis permanecem visíveis, não elegíveis são ocultados

#### **Regras de Elegibilidade:**
- **Plano Diretor (PD)**: Pode vender se não possui OU está vencido (>10 anos)
- **PMSB**: Pode vender se não possui OU está vencido (>4 anos)
- **Outros Produtos**: Sempre podem ser vendidos (REURB, PLHIS, CTM, Start Lab, etc.)

#### **Estados Visuais:**
- **Botão OFF**: "O que vender?" (cinza) - mostra todos os produtos
- **Botão ON**: "Mostrar todos" (verde) - mostra apenas produtos vendáveis

#### **Benefícios:**
- **Decisões Rápidas**: Identifica oportunidades de venda em segundos
- **Foco Estratégico**: Concentra atenção nos produtos realmente vendáveis
- **Interface Intuitiva**: Mesmo layout, apenas filtra produtos não elegíveis
- **Telemetria Integrada**: Acompanhamento de uso para otimização

### 📊 **Módulo Estratégia**
- **Análise de Polos de Valores** (geojson estratégico)
- **Dados de Periferia Urbana** para planejamento
- **Visualização Temática** de conectividade municipal
- **Integração com Dados Municipais** para insights estratégicos
- **Filtro Unificado ESTADO/REGIÃO** com seleção por regiões e estados
- **Indicadores Visuais de Abertura** comercial por estado/região
- **Filtro de Raio Estratégico de João Pessoa** (1.300km)
- **Ferramenta de Raio Interativo** para análise de cobertura de valores

### 🔍 **Ferramenta de Raio Interativo**
A ferramenta de Raio permite ao usuário desenhar um círculo no mapa para calcular o total dos valores estratégicos dos municípios (polos e periferias) que estão dentro da área selecionada.

#### **Como Funciona:**
1. **Ativação**: Clique no botão "Raio" no painel de controles do mapa
2. **Desenho**: Clique e arraste no mapa para definir o centro e raio do círculo
3. **Cálculo Automático**: O sistema identifica todos os municípios que intersectam com o círculo
4. **Resultado**: Exibe o total monetário e lista detalhada dos municípios afetados
5. **Exportação XLSX**: Download de dados organizados por Código IBGE, município, UF e valor

#### **Lógica de Cálculo (Corrigida em 2025):**
- **Polos**: Contribui apenas com `valor_total_origem` (valor gerado no próprio município polo)
- **Periferias**: Contribui com `valor_total_destino` (recursos destinados ao município periférico)
- **Evita Dupla Contagem**: Anteriormente, somava `origem + destinos` para polos e depois somava novamente os destinos individuais das periferias, causando inflação no total. A correção garante que cada valor seja contado apenas uma vez.

#### **Exemplo Prático:**
Para o filtro **PB / Campina Grande**:
- **Card do Polo**: Mostra origem + destinos = R$ X
- **Raio sobre Campina Grande**: Mostra apenas origem (se apenas o polo intersecta) ou origem + destinos das periferias dentro do círculo
- **Resultado**: Valores agora consistentes, sem duplicação

#### **Benefícios:**
- **Análise Estratégica**: Avaliar cobertura de investimentos por área geográfica
- **Planejamento Urbano**: Identificar regiões com maior concentração de valores
- **Decisões Baseadas em Dados**: Totais precisos para relatórios e apresentações

#### **Exportação XLSX Aprimorada:**
- **Coluna "Código IBGE"**: Padronização com códigos oficiais dos municípios
  - **Polos**: Utiliza `codigo_origem` do município polo
  - **Periferias**: Utiliza `codigo_destino` do município periférico
- **Ordenação Alfabética**: Dados ordenados por nome do município
- **Estrutura Completa**: Tipo (Polo/Periferia), Código IBGE, Município, UF, Valor
- **Compatibilidade**: Arquivo compatível com Excel e planilhas Google

### 🗂️ **Filtro Unificado ESTADO/REGIÃO**
O filtro unificado permite uma seleção avançada de estados e regiões para análise estratégica, com indicadores visuais de abertura comercial.

#### **Funcionalidades:**
- **Seleção por Regiões**: Norte, Nordeste, Centro-Oeste, Sudeste, Sul
- **Seleção Individual de Estados**: Todos os 27 estados brasileiros
- **Indicadores de Abertura**: Estados/regiões com abertura comercial marcados em azul
- **Seleção em Lote**: Opções "Todos" e "Todos (Abertura)" para seleção rápida
- **Botão Limpar**: Para resetar todos os filtros aplicados
- **Interface Responsiva**: Dropdown com altura fixa e scroll para grande volume de opções

#### **Estrutura do Filtro:**
```
__________________________
Todos (Abertura)
Todos
[Limpar]
__________________________
REGIÕES:
□ Norte
□ Nordeste (Abertura)
□ Centro-Oeste (Abertura)
□ Sudeste
□ Sul
__________________________
ESTADOS:
□ AC □ AL □ AM ... □ SP
□ BA (Abertura) □ MT (Abertura)
```

#### **Benefícios:**
- **Filtragem Inteligente**: Combinação de filtros por região e estado
- **Visibilidade de Oportunidades**: Indicadores claros de abertura comercial
- **UX Otimizada**: Interface unificada substituindo filtros separados
- **Performance**: Aplicação em tempo real nos dados estratégicos

### 🎯 **Filtro de Raio Estratégico de João Pessoa**
O filtro estratégico permite visualizar apenas os polos e periferias dentro de um raio de 1.300km de João Pessoa, facilitando análises focadas na região Nordeste/Nordeste do Brasil.

#### **Como Funciona:**
1. **Ativação**: Clique no toggle "Raio João Pessoa (1.300km)" no header da página
2. **Filtragem Automática**: Sistema calcula distância geodésica para todos os municípios
3. **Visualização Filtrada**: Mapa, dropdowns e métricas mostram apenas municípios dentro do raio
4. **Desativação**: Clique novamente no toggle para voltar à visualização completa

#### **Tecnologia de Cálculo:**
- **Fórmula de Haversine**: Cálculo preciso de distâncias na superfície terrestre
- **Centro Geográfico**: João Pessoa (latitude: -7.14804917856058, longitude: -34.95096946933421)
- **Raio Estratégico**: 1.300 km exatos
- **Centroide Inteligente**: Cálculo automático do centro geométrico de cada município

#### **Componentes Filtrados:**
- **Mapa Interativo**: Polígonos de polos e periferias dentro do raio
- **Dropdown POLO**: Apenas polos dentro do raio de 1.300km
- **Dropdown MUNICÍPIOS PRÓXIMOS**: Apenas periferias dentro do raio
- **Cards de Métricas**: Cálculos baseados apenas nos dados filtrados
- **Busca por Texto**: Resultados filtrados pelos municípios dentro do raio

#### **Interface do Usuário:**
```
┌─────────────────────────────────────────────────────────┐
│ [Toggle: Raio João Pessoa (1.300km)] [Filtro Ativo]     │
└─────────────────────────────────────────────────────────┘
```

- **Toggle Visual**: Switch com estados ativos/inativos distintos
- **Indicador Ativo**: Badge azul "Filtro Ativo" quando ativado
- **Feedback Imediato**: Filtragem aplicada instantaneamente
- **Reset Inteligente**: Seleções inválidas são automaticamente removidas

#### **Lógica de Filtragem:**
```typescript
// Função de cálculo de distância
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  // Implementação da fórmula de Haversine
};

// Filtragem condicional
const filterByJoaoPessoaRadius = (municipios) => {
  if (!isJoaoPessoaFilterActive) return municipios;

  return municipios.filter(municipio => {
    const centroid = getCentroid(municipio.geom);
    const distance = calculateDistance(
      JOAO_PESSOA_COORDS[0], JOAO_PESSOA_COORDS[1],
      centroid[0], centroid[1]
    );
    return distance <= JOAO_PESSOA_RADIUS_KM;
  });
};
```

#### **Casos de Uso Estratégicos:**
- **Análise Regional**: Foco na região Nordeste/Nordeste
- **Planejamento de Visitas**: Municípios estratégicos acessíveis
- **Avaliação de Mercado**: Potencial comercial na região
- **Comparativo Regional**: Performance vs resto do Brasil

#### **Benefícios:**
- **Foco Estratégico**: Visualização direcionada para área de interesse
- **Performance Otimizada**: Menos dados para processar e renderizar
- **Experiência Fluida**: Transições suaves entre modos
- **Flexibilidade Total**: Alternância fácil entre visão completa e filtrada
- **Análise Estratégica**: Insights específicos para região Nordeste

### 🎯 **Sistema Avançado de Exportação do Raio**
O Raio agora oferece um sistema completo de exportação profissional com múltiplos formatos para análise estratégica avançada.

#### **Critérios de Seleção:**
- **Intersecta** (padrão): Municípios que tocam qualquer parte do círculo
- **Contém**: Apenas municípios cujo centroide está completamente dentro do círculo

#### **Formatos Disponíveis:**

##### **📊 XLSX Completo:**
- **7 Abas Estruturadas**: Metadados, Subtotais, Polos, Periferias, Consolidado, Produtos Detalhados Periferia, Produtos Detalhados Polos
- **Metadados Ricos**: Raio, centro geográfico, critério, timestamp, filtros aplicados
- **Subtotais Detalhados**: Origem vs Destinos com valores formatados
- **Listas Completas**: Códigos IBGE, municípios, UFs e valores individuais
- **Produtos Detalhados Periferia**: Visão específica dos valores destino por município periférico
- **Produtos Detalhados Polos**: Visão específica dos valores origem por município polo

##### **🏙️ Produtos Detalhados Periferia:**
- **Foco em Destinos**: Um registro por município periférico dentro do raio
- **11 Colunas de Produtos**: Apenas variáveis `_destino` (PD, PMSB, CTM, etc.)
- **Colunas de Identificação**: codigo_origem, codigo_destino, municipio_destino, UF
- **Coluna Total**: Soma de todos os valores destino para conferência
- **Visão Específica**: Análise detalhada dos municípios que recebem recursos

##### **🏭 Produtos Detalhados Polos:**
- **Foco em Origens**: Um registro por município polo dentro do raio
- **11 Colunas de Produtos**: Apenas variáveis `_origem` (PD, PMSB, CTM, etc.)
- **Colunas de Identificação**: codigo_origem, municipio_origem, UF
- **Coluna Total**: Soma de todos os valores origem para conferência
- **Visão Específica**: Análise detalhada dos municípios que geram recursos

##### **📸 PNG do Mapa:**
- **Screenshot Inteligente**: Captura o mapa completo com visualizações ativas
- **Sobreposição de Dados**: Metadados diretamente na imagem (raio, centro, contagem, total)
- **Alta Resolução**: Adequado para apresentações e publicações

#### **Interface de Exportação:**
- **Painel Integrado**: Botões dedicados no painel "Dentro do Raio"
- **Ícones Distintivos**: XLSX e PNG com identificação visual clara
- **Tooltips Informativos**: Descrição completa da funcionalidade
- **Nomes Automáticos**: Arquivos nomeados com data para organização

---

### 🚀 **Sistema de Rotas Multimodal (Página /rotas – 2025)**
O Sistema de Rotas é uma página independente (`/rotas`) com **otimização multimodal completa** utilizando Google Routes API para planejamento inteligente de deslocamentos logísticos entre polos e periferias.

#### ✨ **Estado Atual (Sistema 100% Funcional - Outubro 2025)**
- **Página dedicada `/rotas`** com componente exclusivo `RotaMapa` (MapLibre GL) isolado de `MapLibrePolygons`
- **Seleção múltipla de Polos e Periferias** usando dados compartilhados pelo `EstrategiaDataContext`
- **Filtro por estado** para polos e periferias com **nomes completos** (ex: "Paraíba" ao invés de "PB")
- **Correção crítica do mapeamento UF**: Polos usam `UF_origem`, Periferias usam `UF_destino`
- **Configuração dinâmica de Velocidade Média de Voo** com presets (150 | 180 | 220 | 270 km/h)
- **Sistema de numeração sequencial** nos marcadores do mapa para orientação de rota
- **Interface completamente renovada**:
  - Ícones Lucide (plane, car, building-2, building, gauge) substituindo emojis
  - Backgrounds OKLCH personalizados (`oklch(92% 0.004 286.32)`)
  - Formatação inteligente de tempo ("5 horas e 48 min" ao invés de "348 min")
  - Contadores formatados ("Polos (0 - 695)") com texto menor e cinza
  - Altura de containers aumentada (max-h-56) para melhor visualização
- **Layout responsivo aprimorado**: Painel lateral aumentado (430px → 460px)
- **Tiles OSM raster diretos** (3 subdomínios) substituindo dependência externa Stadia Maps
- **Registro inteligente do mapa** no `mapRegistry` para evitar bugs de visualização
- **Visualização inicial de ligações** (estrutura para linhas de voo e futuras rotas terrestres)
- **Pins SVG customizados** (Polos / Periferias) substituindo círculos simples
- **Remoção proposital de polígonos** (fills) para visão limpa de pontos e conexões
- **Arquitetura preparada** para injeção de camadas de rota (OSRM + voos) sem refatoração estrutural adicional
- **Separação de estilos**: Estratégia usa base Carto Positron; Rotas usa OSM raster/vetor

#### 🔧 **Correções Críticas Implementadas (Outubro 2025)**
- **Correção da Lógica de Transporte**: Polo → Polo sempre usa voo (não tenta rota terrestre)
- **Simplificação da Interface**: Removido checkbox "Preferir voo entre polos" - agora sempre voo
- **Regra de Negócio Clara**: Transportes terrestres apenas entre polos/periferias, nunca entre polos
- **Tratamento de Erros**: Sistema robusto contra conflitos de modal de transporte
- **Performance Otimizada**: Eliminação de cálculos redundantes de decisão de modal
- **Fonte Única de Dados**: Migração para `base_polo_periferia.geojson` com coordenadas diretas
- **Eliminação de Geocoding**: Sistema agora usa coordenadas GPS diretas (`latitude_polo`, `longitude_polo`, `latitude_periferia`, `longitude_periferia`)
- **Otimização de Rotas Periferias Independentes**: Correção crítica do algoritmo TSP para periferias sem polos
- **Ponto de Partida Fixo**: Primeiro município selecionado é sempre o ponto inicial da rota

##### **🔄 Otimização de Periferias Independentes - Correção Crítica (Outubro 2025)**
**Problema Identificado**: Quando apenas periferias eram selecionadas (sem polos), o sistema mantinha a ordem de seleção original sem otimização, resultando em rotas ineficientes.

**Solução Implementada**:
- ✅ **Algoritmo TSP Específico**: `resolverTSPPeriferiasIndependentes()` com Nearest Neighbor otimizado
- ✅ **Ponto de Partida Fixo**: Primeiro município selecionado é sempre o ponto inicial
- ✅ **Otimização dos Demais**: Nearest Neighbor aplicado aos municípios restantes
- ✅ **Equivalência de Algoritmos**: Mesmo nível de otimização que rotas com polos
- ✅ **Logs Detalhados**: Rastreamento completo da otimização aplicada

**Resultado**: Agora rotas entre periferias começam pelo primeiro município selecionado e otimizam a sequência dos demais, reduzindo distâncias e tempo total de deslocamento.

#### 🗺️ **Visualização Multimodal Avançada**
- **Linhas diferenciadas**: Azul tracejado para voos, verde contínuo para rotas terrestres
- **Marcadores especializados**: Polos com ícones de aeroporto, Periferias com marcadores simples
- **Limpeza automática de imagens** para evitar conflitos de marcadores

#### 🔄 **Otimização Multimodal Completa**
- **Google Routes API integrada** para cálculos precisos de rotas terrestres
- **TSP (Traveling Salesman Problem)** otimizado para sequências de voos entre polos
- **TSP local** para otimização de visitas às periferias de cada polo
- **Cálculo de distâncias geodésicas** (Haversine) para voos entre polos
- **Instruções turn-by-turn** em português brasileiro para rotas terrestres
- **Cache multinível**: localStorage (7 dias) + API (24h) para evitar recálculos
- **Rate limiting** (60 req/min) e timeout (15s) para proteção da API
- **Fallback inteligente** para haversine quando Google API indisponível

#### 📊 **Painel de Detalhes Inteligente**
- **3 abas estruturadas**: Resumo, Trechos, Instruções
- **Estatísticas agregadas**: Tempo total, distância total, separação voo vs terrestre
- **Detalhamento por segmento**: Voo "João Pessoa → Campina Grande (120km, 40min)"
- **Instruções passo a passo** para rotas terrestres em português
- **Exportação JSON** estruturada para relatórios externos
- **Clique interativo** nos trechos para destacar no mapa

#### O que Já Foi Desacoplado
- Toda lógica prévia de rotas removida de `/estrategia`
- Estado e efeitos redundantes eliminados (sem fetch duplicado)
- Camadas de polígonos não são carregadas em `/rotas` (focus-first design)

#### ✅ **Funcionalidades 100% Implementadas (Outubro 2025)**
- ✅ **Google Routes API integrada** (substituiu OSRM) para roteamento terrestre preciso
- ✅ **Cálculo de rotas carro reais** (Polo ↔ Periferias) com distância e tempo via Google Routes
- ✅ **Geração de segmentos de voo** com coordenadas precisas de pistas (latitude/longitude) entre polos
- ✅ **Otimização Local (TSP)** para ordem de visita às periferias de cada polo
- ✅ **Otimização Global (TSP)** entre polos via Google Routes API com `optimizeWaypointOrder`
- ✅ **Otimização de Periferias Independentes**: Algoritmo TSP específico para rotas terrestres entre periferias sem polos
- ✅ **Centro Geográfico Inteligente**: Heurística de centroide para otimização de ponto inicial
- ✅ **Painel lateral completo** com 3 abas (Resumo, Trechos, Instruções)
- ✅ **Estatísticas agregadas**: tempo total, km total, separação voo vs terrestre
- ✅ **Exportação JSON** estruturada das rotas integradas
- ✅ **Cache incremental multinível** (7 dias TSP + 24h rotas individuais) com memoização inteligente
- ✅ **Correção crítica de lógica**: Polo → Polo sempre voo (eliminação de conflitos)
- ✅ **Integração completa de pistas de voo**: Join por código IBGE com coordenadas precisas (latitude/longitude)
- ✅ **Interface simplificada**: Remoção de controles desnecessários, informação clara sobre modais
- ✅ **Tratamento robusto de erros**: Fallbacks inteligentes e validações completas
- ✅ **Rate limiting avançado**: 60 req/min com proteção automática contra abuso
- ✅ **Health check completo**: Monitoramento de APIs Google com status detalhado
- ✅ **Modo Vendas - Análise de Oportunidades**: Botão toggle que filtra produtos elegíveis para venda (PD/PMSB por regras, outros sempre visíveis)

#### Próximas Evoluções (Roadmap Futuro)
- ✅ **Exportação PDF**: Relatórios profissionais das rotas calculadas
- Exportação XLSX/PNG das rotas integradas
- Cenários de sensibilidade (diferentes velocidades de voo)
- Persistência de cenários salvos por usuário
- Comparativo de eficiência entre sequências manuais vs otimizadas

#### Justificativa da Separação
A extração do sistema de rotas para `/rotas`:
- Evita interferência de estilos e camadas estratégicas
- Reduz custo cognitivo para o usuário (contexto único por página)
- Permite iteração rápida em camadas de rota sem risco sobre análises estratégicas
- Melhora performance inicial (lazy load apenas do necessário)

#### Valor Estratégico (Mesmo Objetivo Original)
Continua alinhado em apoiar planejamento territorial e priorização de visitas, agora com base modular que permite evolução controlada rumo ao pacote completo de otimização multimodal.

---

## 🚀 **Funcionalidades Planejadas / Roadmap Complementar**

Além da evolução do Sistema de Rotas detalhada acima, permanecem como itens de roadmap geral:

### 🛤️ Sistema de Rotas Multimodal – ✅ **COMPLETO (2025)**
- [x] **Google Routes API integrada** (substituiu OSRM)
  - Rate limiting (60 req/min por IP)
  - Cache incremental multinível (7 dias + 24h)
  - Validações de entrada e timeout (15s)
  - Tratamento de erros com fallbacks para haversine
- [x] **Health check das APIs** (`/api/rotas/health`)
- [x] **Integração completa com frontend multimodal**
  - Hook `useRotas` otimizado para multimodal
  - `calcularRotaTerrestre` usando Google Routes API
  - Estados de loading/erro tratados
- [x] **Documentação completa**
  - `docs/GOOGLE_ROUTES_SETUP.md` - Setup da API
  - `docs/SISTEMA_ROTAS_MULTIMODAL.md` - Arquitetura técnica
  - `IMPLEMENTACAO_ROTAS_MULTIMODAL_2025.md` - Resumo executivo
- [x] **Camada visual multimodal** (azul tracejado para voos, verde contínuo para rotas)
- [x] **Instruções turn-by-turn** em português brasileiro
- [x] **Ordens otimizadas (TSP completo)** - Global entre polos + Local por polo
- [x] **Painel de detalhes inteligente** com 3 abas estruturadas
- [x] **Exportação JSON** estruturada das rotas integradas
- [x] **Comparativo automático** vs sequência manual nos cálculos
- [x] **Limpeza automática de imagens** para evitar conflitos de marcadores
- [x] **Correção crítica de lógica de transporte** (Outubro 2025)
  - Polo → Polo sempre voo (eliminação de conflitos API)
  - Interface simplificada (remoção controles desnecessários)
  - Tratamento robusto de erros e validações completas
  - Performance otimizada (eliminação cálculos redundantes)

### 🗺️ Estratégia / Análise
- [ ] Clusterização dinâmica de polos em níveis de zoom distintos

### 📊 Relatórios & Exportações
- [ ] Export consolidado multi-raio
- [ ] Export geoespacial (GeoPackage ou Shapefile zipado)

### ⚡ Performance
- [x] **Cache incremental de rotas OSRM** (memoização por par coordenado, TTL 1h)
- [x] **Sistema de Cache Multinível Google Routes** (Outubro 2025)
  - **Otimização TSP**: Cache de 7 dias para sequências otimizadas
  - **Rotas Individuais**: Cache de 24 horas para rotas terrestres
  - **Memoização Inteligente**: Evita recálculos desnecessários
  - **Limpeza Automática**: Expiração TTL e invalidação sob demanda
- [ ] WebWorker para cálculos de otimização (TSP)
- [ ] Pré-indexação espacial (R-tree) para matching rápido de periferias

### 🔐 Segurança & Auditoria
- [x] **Rate limiting na API de rotas** (60 req/min por IP)
- [x] **Logs de uso de geração de rotas** (console logs estruturados)
- [x] **Controle Preventivo de Custos Google Maps API** (Kill Switch + Limites Diários)
- [x] **API Guard System** - Proteção automática contra custos excessivos
- [x] **Monitoramento de Status** - Endpoint `/api/maps/status` para acompanhar uso
- [ ] Auditoria completa em banco de dados
- [x] **Limite de requisições OSRM por janela de tempo (implementação avançada)**
- [x] **Controle Preventivo de Custos Google Maps API (Kill Switch + Limites Diários)**
- [x] **API Guard System - Proteção automática contra custos excessivos**

### 🧪 Qualidade
- [ ] Testes de snapshot visual de camadas
- [ ] Testes unitários de utilidades de distância/haversine

Lista dinâmica – prioridades podem mudar conforme feedback operacional.

### 💼 **Gestão Completa de Produtos**
- **12 Produtos Municipais** com status automático:
  - Plano Diretor (verificação de vencimento 10 anos)
  - PMSB (verificação de vencimento 4 anos)
  - IPTU Legal (CTM)
  - REURB (Regularização Fundiária)
  - Start Lab (Educação Fundamental)
  - Educa Game (Jogos Educativos)
  - Procon Vai às Aulas (PVA)
  - VAAT (Valor Anual Aluno/Professor)
  - Livros Didáticos (Fundamental 1 e 2)
  - Plano Decenal do Meio Ambiente
  - PLHIS (Plano Habitacional)
  - Plano de Desertificação
- **Links Diretos** para Google Drive por produto
- **Status Automático**: Em dia / Vencido / Não existe
- **Valores Monetários** formatados automaticamente

### 🎯 **Modo Vendas - Análise de Oportunidades**
- **Botão Toggle "O que vender?"** na barra de ações do mapa
- **Filtragem Inteligente** de produtos elegíveis para venda:
  - **Plano Diretor**: Aparece apenas se município não possui OU está vencido (>10 anos)
  - **PMSB**: Aparece apenas se município não possui OU está vencido (>4 anos)
  - **Outros Produtos**: Sempre aparecem (REURB, PLHIS, CTM, Start Lab, etc.)
- **Interface Intuitiva**: Mesmo layout da tabela, apenas filtra produtos não vendáveis
- **Estados Visuais**: Botão verde quando ativo, cinza quando inativo
- **Telemetria Integrada**: Logs estruturados para análise de uso

### 📄 **Sistema de Exportação**
- **Geração de PDFs** de orçamento personalizados
- **Templates Editáveis** com preenchimento automático
- **Download Direto** com nomes padronizados
- **Modal Avançado** de exportação

### ⚡ **Performance e Cache**
- **Cache Multi-Camadas**: Memória, LocalStorage (30 dias), S3
- **Carregamento Progressivo** com barra de progresso visual
- **Revalidação Inteligente** via ETags e Last-Modified
- **Lazy Loading** de componentes pesados
- **Otimização de Bundle** automática

### 🎨 **Interface Avançada**
- **Animação 3D de Introdução** com React Three Fiber
- **Efeitos de Partículas** interativos ao mouse/touch
- **Transições Suaves** entre estados da aplicação
- **Responsividade Completa**: Mobile, tablet e desktop
- **Tooltips e Popovers** informativos
- **Ícones Customizados** e FontAwesome

---

## Arquitetura
```
Next.js App Router (15) ─┐
                        ├── Frontend (React 19 + TypeScript 5)
                        │   ├── Context API (MapDataContext, UserContext, EstrategiaDataContext)
                        │   ├── Components (MapaMunicipal, InformacoesMunicipio, Nexus3D)
                        │   └── Utils (s3Service, pdfOrcamento, cacheGeojson)
                        │
                        └── Backend (API Routes + Middleware)
                            ├── Autenticação (JWT + bcryptjs)
                            ├── Proxy GeoJSON (/api/proxy-geojson/*)
                            ├── Estratégia (/api/estrategia/data)
                            ├── Municípios (/api/municipios/[estado])
                            ├── Logout (/api/auth/logout)
                            └── Debug/Teste (/api/debug, /api/test-s3)

PostgreSQL ──> Usuários, Municípios, Acessos (Prisma ORM)
AWS S3 ──> GeoJSON, JSON, CSV, PDF Templates
```

### 🗄️ **Banco de Dados (PostgreSQL + Prisma)**
- **Modelo de Usuários**: Autenticação com plataformas múltiplas
- **Municípios**: Dados geográficos e administrativos
- **Controle de Acessos**: Permissões por município e usuário
- **Sistema de Cache**: Spatial reference system integrado

### ☁️ **Integração AWS S3**
**Arquivos Principais Utilizados no Sistema:**

**📍 Dados Municipais (Página /mapa):**
- `base_municipios.geojson` - Dados municipais completos com geometrias, população, políticos e produtos
- `parceiros1.json` - Instituições parceiras com coordenadas geográficas para marcadores no mapa
- `pistas_s3_lat_log.json` - Dados de pistas de voo com coordenadas latitude/longitude por código IBGE

**🎯 Dados Estratégicos (Página /estrategia):**
- `base_polo_valores.geojson` - Análise estratégica de polos de valores municipais
- `base_polo_periferia.geojson` - Dados de conectividade urbana e periferias

**🔐 Configurações e Segurança:**
- `senhas_s3.json` - Configurações seguras do sistema (credenciais, APIs, etc.)

### 🔄 **Fluxo de Dados Completo**
1. **Cliente** acessa aplicação → Animação 3D de introdução
2. **Login** → Validação JWT + controle de plataformas
3. **Middleware** verifica autenticação para rotas protegidas
4. **MapDataContext** carrega dados via `/api/proxy-geojson/files`
5. **S3 Service** faz download paralelo dos arquivos GeoJSON
6. **Cache System** armazena dados (memória + localStorage + S3)
7. **Mapa** renderiza com Leaflet + camadas temáticas
8. **Busca** filtra municípios com normalização de acentos
9. **Destaque** calcula centroides e anima transições
10. **Painel** exibe produtos com status automático
11. **Export** gera PDFs via template personalizado

### 🚀 **Arquitetura Avançada: Resolução de Remount-Triggered Fetching**

#### **🎯 Problema do Next.js App Router**
No Next.js App Router, cada página é um componente React independente. Ao navegar entre rotas:
- Página anterior **desmonta** completamente
- Nova página **monta** do zero
- `useEffect` roda novamente → **fetch desnecessário**
- Resultado: múltiplos fetches para os mesmos dados

```typescript
// ❌ PROBLEMA: Fetch em cada navegação
function PaginaMapa() {
  useEffect(() => {
    fetch('/api/dados').then(setData); // 🔥 Executa toda vez
  }, []);
}

function PaginaEstrategia() {
  useEffect(() => {
    fetch('/api/dados').then(setData); // 🔥 Outro fetch
  }, []);
}
```

#### **✅ Solução: MapDataContext com Cache Hierárquico**

```typescript
// ✅ SOLUÇÃO: Provider persiste + useEffect condicional
export function MapDataProvider({ children }) {
  useEffect(() => {
    if (mapData) return; // 🔥 PULA se dados existem
    loadData();
  }, [mapData]);

  // Cache multi-camada + SWR
  const loadData = async () => {
    // 1️⃣ Cache localStorage (instantâneo)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached?.data) {
      setMapData(cached.data);
      setLoading(false);
      void fetchAndStore(false); // Revalidação em background
      return;
    }
    // 2️⃣ Fetch completo se necessário
    await fetchAndStore(true);
  };
}
```

#### **📊 Fluxo Otimizado de Navegação**

```
1️⃣ Login → /mapa (fetch + loading na primeira vez)
   ├── MapDataProvider criado no Root Layout
   └── Cache localStorage (30 dias)

2️⃣ Navegação /mapa → /estrategia
   ├── MapDataProvider PERSITE (não desmonta)
   ├── useEffect vê mapData existe → SEM FETCH
   └── Dados já disponíveis ⚡

3️⃣ Refresh ou nova sessão
   ├── Cache localStorage recuperado
   ├── UI renderiza instantaneamente
   └── Revalidação silenciosa em background
```

#### **🏆 Benefícios da Arquitetura**

- **🚀 Zero fetches** em navegações entre páginas
- **💾 Cache hierárquico**: Memória → localStorage → API
- **🔄 Stale-While-Revalidate**: Dados velhos servem imediatamente
- **⚡ Navegação instantânea** entre rotas
- **📱 UX superior** com estados de loading apropriados

#### **🔧 Implementação Técnica**

```typescript
// Root Layout - Provider persiste
<MapDataProvider>  {/* 🔥 Nunca desmonta */}
  {children}
</MapDataProvider>

// Context - Controle inteligente
useEffect(() => {
  if (mapData) return; // Condição crítica
  loadData();
}, [mapData]); // Dependência no estado

// Cache Strategy - TTL + SWR
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
```

Esta arquitetura resolve completamente o problema de **remount-triggered fetching** e **overfetching**, garantindo performance excepcional em aplicações Next.js App Router.

#### 🎯 **Arquitetura Avançada: Resolução de Conflitos de Imagens MapLibre GL**

##### **🎯 Problema dos Marcadores Duplicados**
No MapLibre GL, adicionar imagens com IDs já existentes gera erro crítico:
```javascript
// ❌ ERRO: "An image named 'polo-marker-1' already exists"
map.addImage('polo-marker-1', img);
map.addImage('polo-marker-1', img); // 💥 CRASH!
```

##### **✅ Solução: Verificação Dupla + Limpeza Automática**

```typescript
// ✅ SOLUÇÃO: Verificação antes de adicionar
const loadMarkerImage = (id: string, url: string) => {
  return new Promise<void>((resolve) => {
    // 1️⃣ Verificar SE já existe
    if (map.hasImage(id)) {
      console.log(`Imagem ${id} já existe, pulando...`);
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // 2️⃣ Verificar NOVAMENTE (race condition)
        if (!map.hasImage(id)) {
          map.addImage(id, img);
        }
        resolve();
      } catch (error) {
        console.warn(`Erro ao adicionar imagem ${id}:`, error);
        resolve();
      }
    };
    // ...
  });
};

// ✅ LIMPEZA: Remover imagens antigas automaticamente
const cleanupLayers = () => {
  // ... limpeza de layers e sources ...

  // 3️⃣ Remover imagens de marcadores antigos
  const imageKeys = Object.keys((map as any).style.imageManager?.images || {});
  imageKeys.forEach(imageId => {
    if (imageId.startsWith('polo-marker-') || imageId.startsWith('periferia-marker-')) {
      try {
        if (map.hasImage(imageId)) {
          map.removeImage(imageId);
        }
      } catch (error) {
        console.warn(`Erro ao remover imagem ${imageId}:`, error);
      }
    }
  });
};
```

##### **🏆 Benefícios da Arquitetura**

- **🚫 Zero crashes** por imagens duplicadas
- **🔄 Recálculo seguro** de rotas múltiplas vezes
- **⚡ Performance otimizada** com limpeza automática
- **🛡️ Robustez** contra race conditions
- **📝 Logs informativos** para debug

#### **🎯 Implementação na Página Estratégia**

A página `/estrategia` foi atualizada para usar o mesmo padrão de cache hierárquico, resolvendo o problema de **remount-triggered fetching** dos dados estratégicos:

```typescript
// ❌ ANTES: Fetch direto na página (problema!)
useEffect(() => {
  const [valoresResp, periferiaResp] = await Promise.all([
    fetchGeoJSONWithCache('/data/base_polo_valores.geojson', 'geo:polo_valores'),
    fetchGeoJSONWithCache('/data/base_polo_periferia.geojson', 'geo:polo_periferia')
  ]);
  // Processamento dos dados...
}, []);

// ✅ DEPOIS: Usando EstrategiaDataContext (solução!)
const { estrategiaData, loading, error } = useEstrategiaData();

useEffect(() => {
  if (!estrategiaData || loading) return;
  // Processamento dos dados do contexto...
}, [estrategiaData, loading]);
```

**🔄 Atualizações Realizadas:**
- ✅ **Criado** `EstrategiaDataContext.tsx` - Contexto dedicado para dados estratégicos
- ✅ **Integrado** `EstrategiaDataProvider` no `layout.tsx`
- ✅ **Migrado** `/estrategia/page.tsx` para usar contexto ao invés de fetch direto
- ✅ **Mantido** `/api/estrategia/data/route.ts` - API route otimizada
- ✅ **Removido** `useS3Data.ts` - Hook obsoleto não utilizado

**📊 Resultado:**
- **Zero fetches** em navegações entre `/mapa` e `/estrategia`
- **Cache compartilhado** para `base_polo_valores.geojson` e `base_polo_periferia.geojson`
- **Performance otimizada** com SWR (Stale-While-Revalidate)

---

## Estrutura de Pastas
```text
src/
├── app/                    # Páginas & rotas da API (Next.js App Router)
│   ├── api/               # API Routes
│   │   ├── auth/          # Sistema de autenticação
│   │   │   ├── route.ts   # Login POST
│   │   │   ├── verify/    # Verificação JWT GET
│   │   │   └── logout/    # Logout POST
│   │   ├── proxy-geojson/ # Proxy para arquivos S3
│   │   │   ├── [filename]/ # Rota dinâmica para arquivos
│   │   │   └── files/     # Lista de arquivos disponíveis
│   │   ├── estrategia/    # Dados estratégicos
│   │   ├── municipios/    # Dados por estado
│   │   ├── rotas/         # Sistema de rotas multimodal
│   │   │   ├── google-routes/route.ts         # Rotas terrestres via Google Routes
│   │   │   └── google-routes-optimize/route.ts # Otimização TSP via Google Routes
│   │   └── debug/         # Utilitários de debug
│   ├── mapa/              # Página principal do mapa
│   ├── estrategia/        # Módulo estratégico
│   ├── rotas/             # Sistema de rotas independente
│   ├── login/             # Tela de autenticação
│   ├── layout.tsx         # Layout raiz com providers
│   ├── globals.css        # Estilos globais Tailwind
│   └── page.tsx           # Página inicial com animação 3D
│
├── components/            # Componentes React reutilizáveis
│   ├── MapaMunicipal.tsx  # Componente principal do mapa
│   ├── InformacoesMunicipio.tsx # Painel de produtos
│   ├── Nexus3D.tsx        # Animação 3D de introdução
│   ├── Sidebar.tsx        # Navegação lateral
│   ├── Navbar.tsx         # Cabeçalho da aplicação
│   ├── ModalOrcamento.jsx # Modal de orçamento
│   ├── ExportMenu.jsx     # Menu de exportação
│   ├── LayerControl.tsx   # Controles de camadas
│   ├── routing/           # Componentes do sistema de rotas multimodal
│   │   ├── RotasComponent.tsx     # Interface principal de rotas
│   │   ├── RotaMapVisualization.tsx # Visualização multimodal no mapa
│   │   ├── ConfiguracaoRotas.tsx  # Configuração de velocidade
│   │   ├── RotaMapa.tsx           # Componente do mapa para rotas
│   │   ├── DetalhesRotaPanel.tsx  # Painel de detalhes inteligente
│   │   └── index.ts               # Exportações dos componentes
│   └── MapaMunicipal.tsx  # Componente principal do mapa
│
├── contexts/              # Contextos React para estado global
│   ├── MapDataContext.tsx     # Dados do mapa e cache
│   ├── UserContext.tsx        # Estado do usuário autenticado
│   └── EstrategiaDataContext.tsx # Dados estratégicos e cache
│
├── utils/                 # Utilitários e serviços
│   ├── s3Service.ts       # Cliente S3 e cache
│   ├── pdfOrcamento.ts    # Geração de PDFs + conversão UF ↔ Estado
│   ├── cacheGeojson.ts    # Cache inteligente
│   ├── authService.ts     # Utilitários de auth
│   ├── passwordUtils.ts   # Utilitários de senha
│   ├── mapConfig.ts       # Configurações do mapa
│   ├── mapRegistry.ts     # Registro global de instâncias do mapa
│   ├── routingUtils.ts    # Utilitários de rotas terrestres
│   └── routingOptimization.ts # Otimização multimodal e TSP
│
├── lib/                   # Configurações de bibliotecas
│   └── prisma.ts          # Cliente Prisma configurado
│
├── types/                 # Tipagens TypeScript
│   └── leaflet.d.ts       # Extensões para Leaflet
│
└── middleware.ts          # Middleware Next.js para proteção
```

### 📁 **Arquivos de Configuração (Raiz)**
```
prisma/
├── schema.prisma         # Schema do banco PostgreSQL
public/
├── template/             # Templates de PDF
├── municipios.xlsx       # Dados municipais Excel
└── logos/               # Assets visuais
```

---

## Tecnologias Utilizadas

### 🎯 **Core Framework**
- **Next.js 15.3.2** (App Router & API Routes)
- **React 19.0.0** com TypeScript 5
- **TailwindCSS 4** - Estilização utilitária responsiva
- **Node.js 18+** com Turbopack

### 🗺️ **Mapas e Visualização Geoespacial**
- **Leaflet 1.9** & **leaflet-draw** - Mapa 2D interativo
- **MapLibre GL** - Motor de renderização de mapas
- **Turf.js** - Operações geoespaciais avançadas
- **Polylabel** - Cálculo de centroides de polígonos
- **GeoJSON** - Formato padrão para dados geográficos

### 🎨 **Interface e Animações**
- **Three.js 0.176** & **React Three Fiber** - Animações 3D
- **@react-three/drei** - Utilitários Three.js para React
- **Framer Motion 12** - Transições e gestos suaves
- **Lucide React** - Ícones SVG modernos (plane, car, building-2, building, gauge)
- **React Icons** - Biblioteca de ícones
- **FontAwesome 6** - Ícones vetoriais

### ☁️ **Backend e Banco de Dados**
- **Prisma ORM** - Cliente PostgreSQL com type safety
- **PostgreSQL** - Banco de dados relacional
- **AWS SDK v3** (`@aws-sdk/client-s3`) - Integração S3
- **Google Routes API** - Otimização de rotas terrestres e TSP
- **Google Maps JavaScript API** - Visualização interativa de mapas
- **bcryptjs** - Hashing seguro de senhas
- **jsonwebtoken** & **jose** - Tokens JWT
- **dotenv** - Gerenciamento de variáveis ambiente

### 📄 **Documentos e Dados**
- **pdf-lib** - Geração e manipulação de PDFs
- **xlsx** - Leitura de arquivos Excel
- **file-saver** - Downloads de arquivos
- **jszip** - Compressão de arquivos
- **downloadjs** - Utilitários de download

### 🔧 **Utilitários e Desenvolvimento**
- **ESLint 9** & **Next.js ESLint** - Linting de código
- **TypeScript 5** - Type safety avançado
- **Zustand** - Gerenciamento leve de estado
- **date-fns** - Manipulação de datas (implicado)
- **polylabel** - Cálculos geométricos

### 📦 **Dependências de Desenvolvimento**
- **@types/** - TypeScript definitions para todas as libs
- **eslint-config-next** - Configuração ESLint para Next.js
- **tailwindcss 4** - Framework CSS utilitário
- **postcss** - Processamento CSS

---

## Configuração do Ambiente

### 📋 **Pré-requisitos**
- **Node.js 18+** com npm ou yarn
- **PostgreSQL** (local ou cloud)
- **Conta AWS** com permissões de leitura no bucket S3
- **Git** para controle de versão

### 🗄️ **Configuração do Banco de Dados**
1. **Instalar PostgreSQL** ou usar serviço cloud (RDS, Supabase, etc.)
2. **Criar banco de dados** para o projeto
3. **Configurar variáveis** de conexão no `.env.local`

### ☁️ **Configuração AWS S3**
1. **Criar bucket S3** com os arquivos necessários
2. **Configurar política IAM** com permissões de leitura
3. **Gerar access keys** para o usuário IAM

### 🔧 **Variáveis de Ambiente**
Criar arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/nexus_db"

# AWS S3 Configuration
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=projetonexusinnovatis

# Autenticação JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Sistema de Rotas Multimodal
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_google_maps_aqui
# Nota: A mesma chave é usada para Google Maps JavaScript API e Google Routes API
OSRM_URL=http://localhost:5000  # Fallback opcional

# Controle Preventivo de Custos Google Maps API
MAPS_DISABLED=false                    # Kill Switch: desabilita todas as chamadas quando true
MAPS_DAILY_CAP_ROUTES=1000             # Limite diário para Routes API
MAPS_DAILY_CAP_GEOCODE=1000            # Limite diário para Geocoding API

# Ambiente (desenvolvimento/produção)
NODE_ENV=development
```

### 📁 **Arquivos S3 Necessários**
O bucket deve conter estes arquivos na raiz:

**📍 Dados Municipais (Página /mapa):**
- `base_municipios.geojson` - Dados municipais completos com geometrias
- `parceiros1.json` - Instituições parceiras com coordenadas
- `pistas_s3_lat_log.json` - Dados de pistas de voo com coordenadas

**🎯 Dados Estratégicos (Página /estrategia):**
- `base_polo_valores.geojson` - Análise estratégica de polos
- `base_polo_periferia.geojson` - Dados de conectividade urbana

**🔐 Configurações:**
- `senhas_s3.json` - Configurações seguras do sistema

### 🚀 **Instalação e Inicialização**
```bash
# 1. Clonar repositório
git clone <repository-url>
cd projeto-nexus

# 2. Instalar dependências
npm install

# 3. Configurar banco de dados
npx prisma generate
npx prisma db push

# 4. Executar migrações (se houver)
npx prisma migrate dev

# 5. Configurar OSRM (Sistema de Rotas)
# Windows:
.\scripts\setup-osrm.ps1

# Linux/Mac:
chmod +x scripts/setup-osrm.sh
./scripts/setup-osrm.sh

# 6. Iniciar servidor de desenvolvimento
npm run dev
```

### 📖 **Guias de Setup Específicos**
- **Sistema de Rotas (OSRM)**: Ver [`docs/ROTAS_QUICKSTART.md`](docs/ROTAS_QUICKSTART.md) para setup rápido
- **OSRM Detalhado**: Ver [`docs/OSRM_SETUP.md`](docs/OSRM_SETUP.md) para configuração avançada

### 🔍 **Verificação da Instalação**
- Acesse `http://localhost:3000`
- Faça login com credenciais válidas
- Verifique se o mapa carrega corretamente
- Teste a busca por municípios
- Confirme exportação de PDFs funcionando
- **Verifique sistema de rotas multimodal**:
  - Acesse `http://localhost:3000/rotas`
  - Teste health check: `http://localhost:3000/api/rotas/health`
  - Configure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` no `.env.local`
  - Teste cálculo de rota entre polos e periferias

---

## Scripts NPM

### 🚀 **Desenvolvimento**
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Ambiente de desenvolvimento com Turbopack |
| `npm run dev -- --host 0.0.0.0` | Expor na rede local para testes mobile |
| `npm run dev -- --port 3001` | Executar em porta específica |

### 🏗️ **Produção e Build**
| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build otimizado para produção |
| `npm run start` | Iniciar servidor de produção |
| `npm run vercel-build` | Build específico para Vercel (com Prisma) |

### 🔧 **Banco de Dados e Prisma**
| Comando | Descrição |
|---------|-----------|
| `npx prisma generate` | Gerar cliente Prisma |
| `npx prisma db push` | Aplicar schema ao banco (sem migração) |
| `npx prisma migrate dev` | Criar e aplicar migrações |
| `npx prisma studio` | Interface gráfica do Prisma |
| `npx prisma db seed` | Popular banco com dados iniciais |

### 🧹 **Qualidade de Código**
| Comando | Descrição |
|---------|-----------|
| `npm run lint` | Executar ESLint |
| `npm run lint -- --fix` | Corrigir automaticamente erros ESLint |
| `npx tsc --noEmit` | Verificar tipos TypeScript |

### 🐛 **Debug e Testes**
| Comando | Descrição |
|---------|-----------|
| `npm run debug` | Ambiente com logs detalhados |
| `npx next lint --file src/components/ModalOrcamento.jsx` | Lint arquivo específico |

### 📦 **Utilitários**
| Comando | Descrição |
|---------|-----------|
| `npm install` | Instalar todas as dependências |
| `npm ci` | Instalar dependências de produção (CI/CD) |
| `npm audit` | Verificar vulnerabilidades de segurança |
| `npm outdated` | Listar pacotes desatualizados |

---

## Visualização em Dispositivos Móveis
1. **Ferramentas do Navegador**:  
   Chrome/Edge → `F12` → *Toggle Device Toolbar* (`Ctrl+Shift+M`).
2. **Rede Local**:  
   Execute `npm run dev -- --host 0.0.0.0` e acesse `http://SEU_IP:3000` no celular.
3. **Responsividade**:  
   O layout utiliza TailwindCSS *mobile-first* + utilitários (`flex-col`, `md:grid`, etc.).

---

## Fluxo da Aplicação

### 🎬 **Jornada do Usuário**

#### **1. Entrada na Aplicação** (`/`)
- **Animação 3D** de introdução com Nexus3D
- **Efeitos visuais** interativos (partículas responsivas)
- **Transição automática** para tela de boas-vindas
- **Botão de acesso** ao login

#### **2. Autenticação** (`/login`)
- **Formulário de login** (username/email + senha)
- **Validação JWT** com controle de plataformas
- **Middleware de proteção** para rotas `/mapa` e `/estrategia`
- **Redirecionamento automático** se já autenticado

#### **3. Dashboard Principal** (`/mapa`)
- **Carregamento progressivo** dos dados GeoJSON do S3
- **Barra de progresso** visual em tempo real
- **Cache inteligente** (memória + localStorage + S3)
- **Estados de loading** para diferentes componentes

#### **4. Interação com Mapa**
- **Busca inteligente**: Estado → Município (autocomplete)
- **Destaque visual** do município selecionado
- **Cálculo de centroides** para posicionamento do alfinete
- **Animações de transição** suaves (fade-in/fade-out)
- **Popups informativos** com dados demográficos

#### **5. Painel de Informações** (`InformacoesMunicipio`)
- **12 produtos municipais** com status automático
- **Verificação de vencimento** (PD: 10 anos, PMSB: 4 anos)
- **Links diretos** para Google Drive
- **Formatação monetária** inteligente
- **Ícones visuais** por categoria de produto

#### **6. Sistema de Exportação**
- **Geração de PDFs** via template personalizado
- **Preenchimento automático** de dados municipais
- **Download direto** com nomes padronizados
- **Modal avançado** com opções de exportação

#### **8. Sistema de Rotas** (`/rotas`)
- **Seleção inteligente de municípios**: Polos e periferias com filtros por estado (nomes completos)
- **Configuração de velocidade**: Presets otimizados para planejamento de voos
- **Visualização no mapa**: Marcadores numerados sequencialmente para orientação
- **Interface moderna**: Ícones Lucide, backgrounds personalizados, formatação inteligente
- **Layout responsivo**: Painel lateral otimizado para diferentes tamanhos de tela
- **Tiles OSM nativos**: Mapa confiável sem dependências externas
- **🚀 Sistema de Rotas Multimodal Completo**:
  - **Google Routes API integrada** para cálculos terrestres precisos
  - **Otimização TSP** global (sequência de voos) e local (visitas às periferias)
  - **Visualização multimodal** com linhas diferenciadas (azul voos, verde terrestres)
  - **Painel de detalhes inteligente** com 3 abas estruturadas
  - **Cache multinível** (7 dias TSP + 24h rotas individuais)
  - **Rate limiting avançado** (60 req/min) com proteção automática
  - **Instruções turn-by-turn** completas em português brasileiro
  - **Exportação JSON** estruturada para relatórios externos
  - **Fallback inteligente** para haversine quando API indisponível

### 🔄 **Fluxo de Dados Técnicos**

#### **Autenticação e Autorização**
```
Login Form → API /auth → JWT Token → Cookie HTTP-only
                                      → Verificação Plataforma
                                      → Middleware Protection
```

#### **Carregamento de Dados**
```
MapDataContext → /api/proxy-geojson/files → S3 Parallel Download
                                               → Cache System (3 layers)
                                               → State Update → UI Render
```

#### **Busca e Destaque**
```
Estado Selection → Município Filter → GeoJSON Search
                                       → Turf.js Centroid Calculation
                                       → Leaflet Marker + Animation
                                       → Popup + Info Panel Update
```

#### **Exportação**
```
City Data → pdf-lib Template → Fill Form Fields
                               → Flatten PDF → Download Blob
```

### 🎯 **Estados da Aplicação**
- **Loading**: Carregamento inicial dos dados
- **Ready**: Mapa totalmente carregado e funcional
- **Error**: Estados de erro com fallback
- **Transitioning**: Animações entre estados
- **Authenticated/Unauthenticated**: Controle de acesso

---

## Modelo de Dados

### 🗄️ **Schema Prisma (PostgreSQL)**
```prisma
// Usuários e autenticação
model users {
  id          Int     @id @default(autoincrement())
  email       String? @unique
  username    String? @unique
  hash        String  // senha hasheada com bcrypt
  role        String?
  platforms   String? // controle de acesso por plataforma
  name        String?
  cargo       String?
  photo       String?
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now())
}

// Controle de acessos municipais
model municipio_acessos {
  id           Int         @id @default(autoincrement())
  user_id      Int?
  municipio_id Int?
  exclusive    Boolean     @default(false)
  granted_at   DateTime?   @default(now())
  valid_until  DateTime?
  uf           String?
}

// Dados municipais base
model municipios {
  id                Int                 @id @default(autoincrement())
  municipio         String
  name_state        String
  created_at        DateTime            @default(now())
  updated_at        DateTime            @default(now())
  municipio_acessos municipio_acessos[]
}
```

### 📊 **Dados Geoespaciais**
- **GeoJSON**: Formato padrão para geometrias municipais
- **Projeção**: Sistema de coordenadas brasileiro (SIRGAS 2000)
- **Atributos**: População, domicílios, dados políticos, produtos
- **Índices**: Otimizados para consultas espaciais

---

## Funcionalidades Avançadas

### 🔍 **Sistema de Busca Inteligente**
- **Normalização de acentos** automática
- **Busca fuzzy** com tolerância a erros de digitação
- **Autocomplete** em tempo real
- **Filtragem** por estado e município

### 🎨 **Interface Adaptativa**
- **Responsividade completa**: Mobile (320px) → Desktop (1400px+)
- **Breakpoints otimizados**: sm, md, lg, xl
- **Layout fluido** com CSS Grid e Flexbox
- **Animações performáticas** com CSS transforms

### ⚡ **Performance Otimizada**
- **Lazy loading** de componentes pesados
- **Code splitting** automático por rotas
- **Image optimization** com Next.js Image
- **Bundle analysis** para otimização

### 🛡️ **Controle Preventivo de Custos Google Maps API (2025)**

#### **🎯 Sistema de Kill Switch**
O sistema implementa um controle preventivo robusto contra custos excessivos da Google Maps API através de:

- **Kill Switch Global**: Variável `MAPS_DISABLED=true` desabilita instantaneamente todas as chamadas
- **Limites Diários Configuráveis**:
  - `MAPS_DAILY_CAP_ROUTES`: Limite para Google Routes API (padrão: 1000)
  - `MAPS_DAILY_CAP_GEOCODE`: Limite para Geocoding API (padrão: 1000)
- **API Guard Middleware**: Protege todas as chamadas fetch antes da execução
- **Contadores Automáticos**: Reset diário automático + incrementação apenas em sucesso
- **Monitoramento em Tempo Real**: Endpoint `/api/maps/status` para acompanhar uso

#### **🔄 Funcionamento do Sistema**
```
1. Requisição chega → API Guard verifica condições
   ├── MAPS_DISABLED=true? → Bloqueia (HTTP 429)
   ├── Limite diário atingido? → Bloqueia (HTTP 429)
   └── OK → Permite chamada + incrementa contador
```

#### **📊 Respostas Padronizadas**
- **Kill Switch Ativado**: `HTTP 429 - "Google Maps API Temporarily Disabled"`
- **Limite Excedido**: `HTTP 429 - "Daily API Limit Exceeded"`
- **Detalhes Completos**: Contadores atuais, limites, requisições restantes

#### **🛡️ Proteções Implementadas**
- **Verificação Pré-Fetch**: Bloqueio acontece ANTES da chamada HTTP
- **Sem Custos Adicionais**: Evita qualquer cobrança desnecessária
- **Fallback Seguro**: Sistema continua funcionando mesmo com API bloqueada
- **Logs Detalhados**: Rastreamento completo de decisões de bloqueio

---

### 🔧 **Correções Técnicas Recentes (2025)**
- **Códigos IBGE Corretos**: Popups das periferias agora exibem códigos IBGE corretos
  - Adicionado `codigo_destino` nas properties do FeatureCollection de periferias
  - Fallback inteligente: `codigo_destino` → `codigo` → `codigo_ibge` → vazio
  
- **Sistema Completo de Exportação do Raio**:
  - **XLSX Multi-Abas**: Metadados, subtotais, polos, periferias, consolidado, produtos detalhados periferia, produtos detalhados polos
  - **Abas Específicas**: "Produtos Detalhados Periferia" (11 colunas destino) e "Produtos Detalhados Polos" (11 colunas origem)
  - **PNG do Mapa**: Screenshots de alta resolução com metadados visuais
  - **Critérios de Seleção**: "Intersecta" vs "Contém" para diferentes necessidades
  - **Interface Aprimorada**: Botões maiores e melhor posicionamento

- **Filtro Unificado**: Substituição do filtro separado "UF's Abertura"
  - Componente `EstadoDropdown` com Portal React
  - Seleção múltipla por regiões e estados
  - Indicadores visuais de abertura comercial em azul

- **Filtro de Raio Estratégico de João Pessoa**: Implementação completa (Outubro 2025)
  - Toggle visual no header da página com indicador de status ativo
  - Cálculo de distâncias usando fórmula de Haversine (precisão geodésica)
  - Centro geográfico: João Pessoa (latitude: -7.14804917856058, longitude: -34.95096946933421)
  - Raio estratégico: 1.300 km exatos
  - Filtragem automática: Mapa, dropdowns POLO/MUNICÍPIOS, métricas e buscas
  - Centroide inteligente para geometrias Point/Polygon/MultiPolygon
  - Reset automático de seleções inválidas quando filtro ativado/desativado
  - Performance otimizada com memoização e useCallback

- **Sistema de Rotas Multimodal - Implementação Completa**:
  - **Google Routes API Integrada**: Substituição completa do OSRM por Google Routes
  - **Otimização TSP Global e Local**: Sequenciamento inteligente de voos e visitas terrestres
  - **Visualização Multimodal**: Linhas diferenciadas (azul tracejado voos, verde rotas terrestres)
  - **Painel de Detalhes Inteligente**: 3 abas (Resumo, Trechos, Instruções) com turn-by-turn PT-BR
  - **Cache Multinível**: 7 dias (TSP) + 24h (rotas individuais) + localStorage
  - **Rate Limiting Avançado**: 60 req/min com proteção automática
  - **Controle Preventivo de Custos Google Maps API**: Kill Switch + Limites Diários
  - **API Guard System**: Proteção automática contra custos excessivos
  - **Correção de Imagens Duplicadas**: Limpeza automática para evitar conflitos de marcadores
  - **Fallback Inteligente**: Haversine quando Google API indisponível
  - **Documentação Completa**: Setup, arquitetura técnica e guia executivo

- **Controle Preventivo de Custos Google Maps API**:
  - **Kill Switch Global**: `MAPS_DISABLED=true` bloqueia todas as chamadas
  - **Limites Diários Configuráveis**: `MAPS_DAILY_CAP_ROUTES` e `MAPS_DAILY_CAP_GEOCODE`
  - **API Guard System**: Middleware que protege todas as chamadas fetch
  - **Monitoramento em Tempo Real**: Endpoint `/api/maps/status` para acompanhar uso
  - **Respostas Padronizadas**: HTTP 429 com mensagens claras quando bloqueado
  - **Contadores Automáticos**: Reset diário e incrementação apenas em sucesso
  - **Proteção Contra Race Conditions**: Verificação dupla antes de fazer chamadas

- **Migração de Pistas de Voo para JSON**:
  - **Arquivo convertido**: `pistas_s3.csv` → `pistas_s3_lat_log.json` (preserva tipos de dados)
  - **Join por código IBGE**: Códigos artificiais → códigos reais (`codigo_origem` e `codigo_destino`)
  - **Coordenadas precisas**: Latitude e longitude validadas para todos os aeródromos
  - **Taxa de sucesso**: 0.0% → XX.X% (join funcional entre municípios e pistas)

### 🔒 **Segurança Implementada**
- **JWT tokens** com expiração de 1 hora
- **Cookies HTTP-only** para tokens
- **Hashing bcrypt** para senhas
- **Validação de plataforma** por usuário
- **Middleware de proteção** de rotas

---

## Troubleshooting

### 🐛 **Problemas Comuns**

#### **Erro de Conexão S3**
```bash
# Verificar variáveis de ambiente
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Testar conectividade
npx aws s3 ls s3://your-bucket-name/
```

#### **Erro de Autenticação**
```bash
# Verificar JWT_SECRET
echo $JWT_SECRET

# Limpar cookies do navegador
# Developer Tools → Application → Cookies → Delete
```

#### **Problemas com Mapa**
```bash
# Verificar arquivos GeoJSON no S3
npx aws s3 ls s3://your-bucket-name/ --recursive

# Limpar cache do navegador
# Ctrl+Shift+R (hard refresh)
```

#### **Problemas com Controle de Custos Google Maps API**
```bash
# Verificar status do API Guard
curl http://localhost:3000/api/maps/status

# Verificar variáveis de ambiente
echo $MAPS_DISABLED
echo $MAPS_DAILY_CAP_ROUTES
echo $MAPS_DAILY_CAP_GEOCODE

# Resetar contadores (reiniciar servidor)
# Os contadores são resetados automaticamente diariamente
```

#### **Erro de Build**
```bash
# Limpar cache do Next.js
rm -rf .next
npm run build

# Verificar TypeScript
npx tsc --noEmit
```

---

## API Reference

### 🔗 **Endpoints Principais**

#### **Autenticação**
- `POST /api/auth` - Login de usuário
- `GET /api/auth/verify` - Verificar token JWT
- `POST /api/auth/logout` - Logout do usuário

#### **Dados Geoespaciais**
- `GET /api/geojson` - Dados municipais base
- `GET /api/municipios/[estado]` - Municípios por estado
- `GET /api/proxy-geojson/[filename]` - Proxy para arquivos S3
- `GET /api/estrategia/data` - Dados estratégicos

#### **Sistema de Rotas Multimodal**
- `POST /api/rotas/google-routes` - Calcular rota terrestre via Google Routes API
  - **Body**: `{ origem: {lat, lng}, destino: {lat, lng}, travelMode: "DRIVE" }`
  - **Response**: `{ distanciaKm, tempoMinutos, geometria, instrucoes, metadados }`
  - **Features**: Cache (24h), rate limiting (60/min), timeout (15s), fallback haversine, **API Guard Protection**
- `POST /api/rotas/google-routes-optimize` - Otimização TSP via Google Routes API
  - **Body**: `{ start: {lat, lng}, waypoints: [{lat, lng}], mode: "open"|"closed" }`
  - **Response**: `{ order: [indices], totalDistanceKm, totalDurationMin }`
  - **Features**: Cache (7 dias), rate limiting (60/min), até 25 waypoints, field masks otimizados, **API Guard Protection**
- `GET /api/rotas/health` - Health check do sistema de rotas multimodal
  - **Response**: `{ status: "ok"|"warning"|"error", timestamp: string, services: { googleMaps: {available: boolean, status: string, responseTime: number}, cache: {available: boolean, size: number} }, environment: {hasApiKey: boolean, nodeEnv: string} }`
  - **Features**: Teste de conectividade Google Maps, validação API key, status detalhado

#### **Controle de Custos Google Maps API**
- `GET /api/maps/status` - Status atual do controle preventivo de custos
  - **Response**: `{ disabled: boolean, limits: {routes: number, geocode: number}, counters: {routes: number, geocode: number, date: string}, remaining: {routes: number, geocode: number}, canMakeRequests: {routes: boolean, geocode: boolean} }`
  - **Features**: Monitoramento em tempo real, contadores diários, verificação de limites

#### **Utilitários**
- `GET /api/env` - Variáveis de ambiente
- `GET /api/debug` - Informações de debug

---

### 📋 **Padrões de Código**
- **TypeScript strict mode** habilitado
- **ESLint** configurado para Next.js
- **Prettier** para formatação automática
- **Conventional commits** para mensagens

### 🧪 **Testes**
```bash
# Executar linting
npm run lint

# Verificar tipos
npx tsc --noEmit

# Build de produção
npm run build
```

---

## Licença
Distribuído sob a **Licença MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

---

## Suporte
- 📱 **Issues**: GitHub Issues para bugs e solicitações
- 📚 **Documentação**: Este README e comentários no código

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀

---

**Última atualização**: Outubro 2025 - Sistema de Rotas Multimodal + Controle Preventivo de Custos Google Maps API + Integração Completa de Pistas de Voo + Otimização de Periferias Independentes + Filtro de Raio Estratégico de João Pessoa + Modo Vendas - Análise de Oportunidades implementado
