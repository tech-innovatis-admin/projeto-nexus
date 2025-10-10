# Sistema de Rotas - NEXUS

Sistema completo para planejamento de rotas otimizadas entre municípios polos e periferias, integrado ao projeto NEXUS.

## � Últimas alterações

- Registro da instância do mapa em `mapRegistry` para permitir que visualizações externas (ex.: `RotaMapVisualization`) adicionem camadas corretamente.
- Substituição do estilo por tiles raster do OpenStreetMap para evitar dependência de provedores terceiros.
- Formatação do tempo total da rota para exibir horas e minutos (ex.: `5 horas e 48 min`) no lugar de apenas minutos.
- Adição da prop opcional `hideHeader` em `RotasComponent` para permitir ocultar o cabeçalho quando a página já exibe um título principal.
- Substituição de um SVG inline pelo ícone "gauge" da biblioteca Lucide no componente `ConfiguracaoRotas` e pequeno ajuste de espaçamento.
- Correção de contraste no campo de input da velocidade (adicionado `text-black`) para tornar o valor visível sobre fundo branco.


## �📁 Estrutura dos Arquivos

```
src/
├── types/
│   └── routing.ts                    # Interfaces TypeScript para rotas
├── utils/
│   └── routingUtils.ts              # Funções utilitárias (TSP, OSRM, cálculos)
├── hooks/
│   └── useRotas.ts                  # Hook React para gerenciar estado das rotas
└── components/
    └── routing/
        ├── index.ts                 # Exportações centralizadas
        ├── RotasComponent.tsx       # Componente principal de interface
        ├── ConfiguracaoRotas.tsx    # Configurações de rota
        ├── RotaMapVisualization.tsx # Visualização no mapa MapLibre
        └── ExemploIntegracao.tsx    # Guia de integração
```

## 🚀 Funcionalidades

### ✅ Implementadas

- **Seleção de Municípios**: Interface para selecionar polos e periferias
- **Configurações Avançadas**: Velocidade de voo, otimizações, limites de distância
- **Algoritmo TSP**: Otimização da ordem de visita dos municípios
- **Múltiplos Modais**: Suporte para transporte aéreo e terrestre
- **Visualização no Mapa**: Integração com MapLibre GL JS
- **Cache de Rotas**: Evita recálculos desnecessários
- **Estatísticas Detalhadas**: Tempo, distância, quantidade de trechos
- **Interface Responsiva**: Componentes modulares e reutilizáveis

### 🔄 Preparadas para Integração

- **OSRM Integration**: Rotas terrestres realistas (quando servidor estiver ativo)
- **Exportação PDF**: Relatórios profissionais das rotas calculadas com detalhes completos
- **Persistência**: Estado pode ser salvo no contexto ou localStorage

## 💡 Como Usar

### 1. Importação Básica

```typescript
import { RotasComponent, RotaMapVisualization } from '@/components/routing';
import type { RotaCompleta } from '@/types/routing';
```

### 2. Componente Principal

```tsx
<RotasComponent
  municipios={municipiosSelecionados}
  onRotaChange={(rota) => setRotaAtiva(rota)}
  className="shadow-lg"
/>
```

### 3. Visualização no Mapa

```tsx
<RotaMapVisualization
  map={mapRef.current}
  rota={rotaAtiva}
  showLabels={true}
  showDirections={false}
/>
```

### 4. Exportação para PDF

```tsx
import { generateRoutePDF, downloadPDF } from '@/utils/pdfRotas';

// Após calcular a rota
const exportarRotaPDF = async () => {
  const pdfData = await generateRoutePDF({
    rota: rotaAtiva,
    dataGeracao: new Date()
  });

  downloadPDF(pdfData);
};
```

### 4. Hook de Estado

```typescript
const {
  polosSelecionados,
  periferiasSelecionadas,
  rotaAtual,
  configuracao,
  carregando,
  calcularRota
} = useRotas();
```

## 🔧 Configurações

### Configuração Padrão

```typescript
const configuracao = {
  velocidadeMediaVooKmh: 220,        // Helicóptero médio
  preferirVooEntrePolos: true,       // Voo automático entre polos
  limitarDistanciaMaximaTerrestreKm: 400, // Limite para forçar voo
  otimizarOrdemPolos: true,          // TSP entre polos
  otimizarRotasPeriferias: true      // TSP local por polo
};
```

## 🎯 Regras de Negócio

### Classificação de Municípios

- **Polos**: População > 50.000 habitantes
- **Periferias**: População ≤ 50.000 habitantes
- **Aeroportos**: Todos os polos têm aeroporto disponível (independente da população)

### Lógica de Rotas

1. **Entre Polos**: Preferencialmente aéreo (se otimizado)
2. **Polo → Periferia**: Sempre terrestre
3. **Periferia → Periferia**: Sempre terrestre, dentro do mesmo polo
4. **Otimização**: TSP aplicado separadamente para polos e periferias

### Algoritmo TSP Simplificado

- **Polos**: Nearest neighbor com tentativa de força bruta (≤ 8 polos)
- **Periferias**: Nearest neighbor por polo

## 🗺️ Integração com MapLibre

### Camadas Adicionadas

- `rotas-trechos-voo`: Linhas tracejadas azuis
- `rotas-trechos-terrestres`: Linhas sólidas verdes  
- `rotas-polos`: Círculos vermelhos (raio 8px)
- `rotas-periferias`: Círculos amarelos (raio 6px)
- `rotas-labels`: Labels dos municípios (opcional)

### Interatividade

- **Click**: Popups com informações detalhadas
- **Hover**: Cursor pointer nos elementos clicáveis
- **Fit Bounds**: Ajuste automático para mostrar rota completa

## 📊 Estatísticas Calculadas

```typescript
interface EstatisticasRota {
  distanciaTotalKm: number;           // Distância total
  tempoTotalMinutos: number;          // Tempo total
  distanciaVooKm: number;             // Apenas trechos aéreos
  tempoVooMinutos: number;            // Apenas tempo de voo
  distanciaTerrestreKm: number;       // Apenas trechos terrestres
  tempoTerrestreMinutos: number;      // Apenas tempo terrestre
  numeroPolos: number;                // Polos únicos visitados
  numeroPeriferias: number;           // Periferias únicas visitadas
  quantidadeTrechosVoo: number;       // Contagem de voos
  quantidadeTrechosTerrestres: number; // Contagem terrestre
}
```

## 🔗 Integração com OSRM

### Estado Atual
- **Fallback**: Distância haversine + tempo estimado
- **Preparado**: Para integração quando OSRM estiver disponível

### Quando OSRM Estiver Ativo

```typescript
// As funções já estão preparadas:
const trechoTerrestre = await criarTrechoTerrestre(origem, destino);
// Automaticamente usará OSRM se disponível
```

## 🎨 Estilos CSS

### Cores Padrão

```css
:root {
  --rota-voo: #3B82F6;        /* Azul */
  --rota-terrestre: #10B981;  /* Verde */
  --rota-polo: #EF4444;       /* Vermelho */
  --rota-periferia: #F59E0B;  /* Amarelo */
}
```

### Classes Customizáveis

- `.custom-tooltip`: Tooltips dos labels
- `.custom-div-icon`: Ícones personalizados (quando usar Leaflet)

## 🚀 Performance

### Otimizações Implementadas

- **Cache de Rotas**: Evita recálculos idênticos
- **Debounce**: Previne calls excessivos à API
- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: useMemo para cálculos pesados

### Limites Recomendados

- **Polos**: Máximo 12 para performance ideal do TSP
- **Periferias**: Máximo 20 por polo
- **Cache**: Máximo 50 rotas em memória

## 🔧 Troubleshooting

### Problemas Comuns

1. **Mapa não carrega rotas**
   - Verificar se `map` ref está definido
   - Confirmar que MapLibre está inicializado

2. **TSP muito lento**
   - Reduzir número de polos (usar força bruta apenas para ≤ 8)
   - Considerar heurísticas para grandes volumes

3. **OSRM não responde**
   - Sistema usa fallback automático
   - Verificar logs no console

### Debug

```typescript
// Ativar logs detalhados
localStorage.setItem('nexus-rotas-debug', 'true');
```

## 📈 Próximos Passos

### Melhorias Futuras

1. **Algoritmos Avançados**: Genetic Algorithm para TSP grandes
2. **Machine Learning**: Predição de tempos baseada em histórico
3. **Otimização Multi-Objetivo**: Balancear tempo, custo, conforto
4. **Integração com Tráfego**: APIs de trânsito em tempo real
5. **Rotas Alternativas**: Múltiplas opções por trecho

### Integração com NEXUS

1. **Exportação PDF**: Adicionar rotas aos relatórios existentes
2. **Dashboard**: Métricas de rotas no painel principal  
3. **Histórico**: Salvar rotas calculadas por usuário
4. **Compartilhamento**: URLs para rotas específicas

## 🤝 Contribuição

### Estrutura para Novos Recursos

1. **Tipos**: Adicionar em `src/types/routing.ts`
2. **Lógica**: Implementar em `src/utils/routingUtils.ts`
3. **Interface**: Criar componente em `src/components/routing/`
4. **Estado**: Extender `useRotas` hook se necessário

### Convenções

- **Nomes**: camelCase para variáveis, PascalCase para componentes
- **Tipos**: Sempre tipagem explícita
- **Erros**: Tratamento graceful com fallbacks
- **Performance**: Memoização para cálculos custosos

---

## 📞 Suporte

Para dúvidas sobre implementação ou bugs, consulte:

1. **Logs do Console**: Informações detalhadas sobre erros
2. **TypeScript**: Tipagem rigorosa previne muitos problemas
3. **Documentação**: Este README e comentários no código
4. **Exemplo de Integração**: `ExemploIntegracao.tsx`

---

**Sistema desenvolvido especificamente para o projeto NEXUS - Planejamento Estratégico Municipal**