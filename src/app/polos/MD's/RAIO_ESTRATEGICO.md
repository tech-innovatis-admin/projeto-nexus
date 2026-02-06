# 🎯 Raio Estratégico (Strategic Radius)

## Visão Geral

O **Raio Estratégico** é um sistema de filtro avançado que permite visualizar e analisar apenas os municípios que estão dentro de um raio de **1.300 km** a partir de **João Pessoa, Paraíba**.

Este sistema é implementado em duas páginas:
- ✅ **`/estrategia`** - Página de Estratégia (original)
- ✅ **`/polos`** - Página de Polos (nova implementação)

---

## 📍 Configuração

### Coordenadas de Referência

**João Pessoa, Paraíba**
```typescript
Latitude:  -7.14804917856058
Longitude: -34.95096946933421

// Formato MapLibre (lng, lat)
JOAO_PESSOA_COORDS: [-34.95096946933421, -7.14804917856058]
```

### Raio
```typescript
JOAO_PESSOA_RADIUS_KM = 1300 km
```

---

## 🔧 Como Funciona

### 1. **Estado e Toggle**

No componente da página, há um estado que controla se o raio está ativo:

```typescript
const [isRadarActive, setIsRadarActive] = useState(false);
```

O toggle é gerenciado pelo componente `EstrategiaFiltersMenu`, que recebe:

```tsx
<EstrategiaFiltersMenu
  isRadarActive={isRadarActive}
  setIsRadarActive={setIsRadarActive}
  isRelActive={isRelActive}
  setIsRelActive={setIsRelActive}
  onOpenRelacionamentoModal={handleOpenRelacionamentoModal}
/>
```

---

### 2. **Filtragem de Dados (Backend Visual)**

Quando o raio está ativo, os dados são filtrados no `useMemo` da página usando a **fórmula de Haversine**:

```typescript
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

#### Lógica de Filtragem

```typescript
if (isRadarActive) {
  features = features.filter(f => {
    // Extrair coordenadas do geometry
    let lat: number | undefined;
    let lon: number | undefined;

    if (f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0) {
      if (f.geometry.type === 'MultiPolygon') {
        const coords = f.geometry.coordinates as number[][][][];
        const firstCoords = coords[0]?.[0];
        if (firstCoords && firstCoords.length > 0) {
          [lon, lat] = firstCoords[0];
        }
      } else if (f.geometry.type === 'Polygon') {
        const coords = f.geometry.coordinates as number[][][];
        const firstCoords = coords[0];
        if (firstCoords && firstCoords.length > 0) {
          [lon, lat] = firstCoords[0];
        }
      }
    }
    
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }
    
    // Calcula distância e retorna true se dentro do raio
    const distance = calculateDistance(
      JOAO_PESSOA_COORDS[1], // lat
      JOAO_PESSOA_COORDS[0], // lon
      lat,
      lon
    );
    
    return distance <= JOAO_PESSOA_RADIUS_KM;
  });
}
```

**Resultado:** Apenas municípios dentro de 1.300 km de João Pessoa aparecem nas **cards** e nos **cálculos de agregação**.

---

### 3. **Visualização no Mapa (MapLibre GL)**

O mapa é atualizado em tempo real com um `useEffect` no componente `MapaPolos`:

```typescript
useEffect(() => {
  // ... validações iniciais ...
  
  if (radarFilterActive) {
    // 1. Criar círculo do raio usando Turf.js
    const circle = turf.circle(JOAO_PESSOA_COORDS, JOAO_PESSOA_RADIUS_KM, {
      steps: 128,
      units: 'kilometers',
    });

    // 2. Atualizar fonte do raio com o círculo
    const circleFeatureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [circle]
    };
    radarSource.setData(circleFeatureCollection);

    // 3. Filtrar municípios dentro do raio usando Turf.js
    const municipiosDentroDoRaio = baseMunicipios.features.filter(f => {
      try {
        return turf.booleanIntersects(circle as any, f as any);
      } catch {
        return false;
      }
    });

    // 4. Atualizar GeoJSON source do mapa
    const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource;
    const filteredFC: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: municipiosDentroDoRaio as any[]
    };
    municipiosSrc.setData(filteredFC);
  } else {
    // Restaurar todos os municípios e limpar círculo
    const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource;
    municipiosSrc.setData(baseMunicipios as GeoJSON.FeatureCollection);
    
    const emptyFC: GeoJSON.FeatureCollection = { 
      type: 'FeatureCollection', 
      features: [] 
    };
    radarSource.setData(emptyFC);
  }

  map.triggerRepaint();
}, [radarFilterActive, baseMunicipios, mapReady]);
```

#### Camadas Visuais

Duas camadas são adicionadas ao mapa para visualizar o raio:

**1. Preenchimento (Fill)**
```typescript
{
  id: 'radar-circle-fill',
  type: 'fill',
  source: 'radar-circle-src',
  paint: {
    'fill-color': '#0066ff',
    'fill-opacity': 0.15
  }
}
```
- Círculo azul semitransparente (15% de opacidade)
- Mostra visualmente a área de cobertura

**2. Borda (Line)**
```typescript
{
  id: 'radar-circle-line',
  type: 'line',
  source: 'radar-circle-src',
  paint: {
    'line-color': '#0066ff',
    'line-width': 2,
    'line-dasharray': [5, 5]
  }
}
```
- Borda azul com padrão tracejado (5px traço, 5px espaço)
- Delimit claramente o raio

---

## 🗂️ Arquivos Envolvidos

### `/polos` (Implementação Nova)

#### **`src/app/polos/page.tsx`**
- **Linha 22-26**: Constantes de coordenadas e raio
- **Linha 28-40**: Função `calculateDistance()` (Haversine)
- **Linha 130**: Estado `isRadarActive`
- **Linha 291-325**: Lógica de filtro no `useMemo` de `computedData`
- **Linha 494-495**: Props passados para `EstrategiaFiltersMenu`
- **Linha 1194**: Prop `radarFilterActive` passado para `MapaPolos`

#### **`src/app/polos/_components/MapaPolos.tsx`**
- **Linha 8**: Import de Turf.js (`import * as turf from '@turf/turf'`)
- **Linha 7**: Import de GeoJSON types
- **Linha 26**: Interface `MapaPolosProps` com prop `radarFilterActive?`
- **Linha 27**: Parâmetro `radarFilterActive` na assinatura do componente
- **Linha 205-240**: Definição de camadas visuais (`radar-circle-fill` e `radar-circle-line`)
- **Linha 321-372**: useEffect para aplicar filtro visual do raio

#### **`src/app/polos/_components/EstrategiaFiltersMenu.tsx`**
- Botão/toggle que controla `isRadarActive`
- Gerenciado pelo callback `setIsRadarActive`

---

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────┐
│ EstrategiaFiltersMenu               │
│ (Botão de Toggle do Raio)           │
└──────────────┬──────────────────────┘
               │ setIsRadarActive()
               ↓
┌─────────────────────────────────────┐
│ page.tsx - Estado isRadarActive     │
└──────────────┬──────────────────────┘
               │ 
               ├─→ Passa para EstrategiaFiltersMenu (props)
               │
               ├─→ Usa em useMemo (computedData)
               │   - Filtra municípios com Haversine
               │   - Atualiza cards
               │
               └─→ Passa para MapaPolos (radarFilterActive)
                   ↓
        ┌──────────────────────────┐
        │ MapaPolos.tsx            │
        │ useEffect detecta mudança│
        │ de radarFilterActive     │
        └──────────────┬───────────┘
                       │
                       ├─→ Cria círculo com Turf.js
                       │
                       ├─→ Filtra municípios com
                       │   turf.booleanIntersects()
                       │
                       ├─→ Atualiza GeoJSON sources
                       │   - municipios-src (features)
                       │   - radar-circle-src (círculo)
                       │
                       └─→ MapLibre renderiza camadas visuais
```

---

## 🎨 Resultado Visual

Quando o Raio Estratégico está **ativo**:

1. **Mapa**
   - Círculo azul semitransparente (1.300 km de raio)
   - Apenas municípios dentro do círculo são exibidos
   - Borda tracejada azul marca o limite do raio

2. **Cards**
   - Mostram apenas dados dos municípios dentro do raio
   - Agregação é recalculada automaticamente
   - Número de municípios é reduzido

3. **Interatividade**
   - Clique em município dentro do raio: funciona normalmente
   - Clique em município fora do raio: não está visível (já filtrado)

---

## 📦 Dependências

```json
{
  "@turf/turf": "^6.x.x",      // Geoespacial (cálculos de círculo)
  "maplibre-gl": "^3.x.x",     // Renderização do mapa
  "geojson": "^0.5.x"          // Tipos GeoJSON
}
```

### Bibliotecas Utilizadas

| Biblioteca | Funcionalidade |
|-----------|---|
| **Turf.js** | `turf.circle()` - Gera geometria do círculo |
| **Turf.js** | `turf.booleanIntersects()` - Verifica interseção |
| **MapLibre GL** | Renderiza camadas e fontes GeoJSON |
| **Haversine** | Calcula distância entre pontos (implementado manualmente) |

---

## 🔍 Debug e Logs

O sistema inclui logs para facilitar debugging:

```typescript
// Quando ativa
console.log('[MapaPolos] 🎯 Raio ativo: ', 
  municipiosDentroDoRaio.length, 'municípios dentro do raio');

// Quando desativa
console.log('[MapaPolos] ✓ Raio desativado: mostrando todos os municípios');
```

---

## ✨ Características

✅ **Real-time Filtering** - Filtragem instantânea ao ativar/desativar
✅ **Dual Filtering** - Funciona tanto nos dados quanto no mapa
✅ **Visual Feedback** - Círculo azul indica a área de cobertura
✅ **Haversine Precision** - Cálculo acurado de distância geodésica
✅ **GeoJSON Compatible** - Funciona com Polygon e MultiPolygon
✅ **Performance** - Usa `useMemo` e efeitos otimizados

---

## 🚀 Próximas Melhorias Possíveis

- [ ] Permitir customizar o raio (1.300 km é fixo atualmente)
- [ ] Permitir escolher outro ponto de referência (não apenas João Pessoa)
- [ ] Adicionar heatmap de densidade dentro do raio
- [ ] Exportar dados filtrados pelo raio
- [ ] Histórico de raios anteriormente usados
- [ ] Integração com filtros de produtos

---

## 📖 Exemplos de Uso

### Ativar o Raio
```typescript
setIsRadarActive(true);
```

### Desativar o Raio
```typescript
setIsRadarActive(false);
```

### Checar se está ativo
```typescript
if (isRadarActive) {
  // Mostrar apenas dados do raio
}
```

---

## 🐛 Possíveis Problemas

| Problema | Causa | Solução |
|---------|-------|--------|
| Círculo não aparece | Camadas não adicionadas | Verificar se `radar-circle-src` está definida |
| Municípios não filtram | `radarFilterActive` não é passado | Verificar prop em `MapaPolos` |
| Distância incorreta | Coordenadas no formato errado | Usar [lng, lat] para MapLibre e [lat, lng] para Haversine |
| Performance lenta | Muitos municípios ou GeoJSON grande | Usar `useMemo` e evitar recálculos desnecessários |

---

## 📝 Notas Técnicas

1. **Formato de Coordenadas**
   - MapLibre usa `[lng, lat]`
   - Haversine usa `lat, lon` como argumentos separados
   - GeoJSON usa `[lon, lat]` nos coordinates

2. **Turf.js**
   - `turf.circle()` retorna uma Feature, não FeatureCollection
   - É envolvida em FeatureCollection para ser compatível com MapLibre
   - `turf.booleanIntersects()` funciona com qualquer geometria GeoJSON

3. **Performance**
   - O cálculo de Haversine é O(n) onde n é número de municípios
   - Com ~5600 municípios, é praticamente instantâneo
   - Turf.js é otimizado para operações geoespaciais

