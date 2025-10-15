# 🛬 Integração de Pistas de Voo no Sistema de Rotas

## 📋 Visão Geral

Este documento descreve a implementação da integração de pistas de voo (aeródromos) do arquivo `pistas_s3.csv` com o sistema de rotas multimodal do NEXUS.

## 🎯 Objetivos Alcançados

1. ✅ **Carregar dados de pistas de voo** a partir do arquivo `pistas_s3.csv` armazenado no S3
2. ✅ **Mapear pistas aos municípios** através do código IBGE
3. ✅ **Permitir seleção de pistas** quando o município possui múltiplas opções
4. ✅ **Usar coordenadas precisas das pistas** para cálculo de distâncias de voo
5. ✅ **Indicar método de cálculo** (pista-pista, pista-município, etc.)
6. ✅ **Suportar municípios com/sem coordenadas de pista** usando Haversine como fallback

## 📊 Estrutura dos Dados

### Arquivo: `pistas_s3.csv`

```
codigo,uf,cidade,codigo_pista,nome_pista,tipo_pista,latitude_pista,longitude_pista
1200203,AC,Cruzeiro do Sul,SBCZ,Aeroporto Internacional,PUBLI,-7.597774,-72.773191
...
```

**Variáveis:**
- `codigo`: Código IBGE do município (chave para ligação)
- `uf`: Sigla da UF
- `cidade`: Nome do município
- `codigo_pista`: Código ICAO (ex: "SBCZ")
- `nome_pista`: Nome oficial do aeródromo
- `tipo_pista`: "PUBLI" (pública) ou "PRIV" (privada)
- `latitude_pista`: Coordenada geográfica (graus decimais)
- `longitude_pista`: Coordenada geográfica (graus decimais)

**Observação Importante:** Alguns municípios têm pistas cadastradas **sem coordenadas** (latitude/longitude vazias ou zero). Nesses casos, o sistema usa o centro do município e calcula via Haversine.

## 🏗️ Arquitetura da Implementação

### 1. Tipos TypeScript (`src/types/routing.ts`)

```typescript
export interface PistaVoo {
  codigo_pista: string;
  nome_pista: string;
  tipo_pista: string;
  latitude_pista: number;
  longitude_pista: number;
  coordenadas: Coordenada;
}

export interface MunicipioBase {
  // ... campos existentes
  pistas?: PistaVoo[];
  pistaSelecionada?: PistaVoo;
}

export interface TrechoVoo {
  // ... campos existentes
  usaPistaOrigem?: boolean;
  usaPistaDestino?: boolean;
  metodoCalculo?: 'pista-pista' | 'pista-municipio' | 'municipio-pista' | 'municipio-municipio';
}
```

### 2. Carregamento de Dados (`MapDataContext.tsx`)

O arquivo `pistas_s3.csv` é carregado junto com os demais dados do S3 através do endpoint `/api/proxy-geojson/files`:

```typescript
const organizedData: MapData = {
  // ... outros dados
  pistas: files.find((f: any) => f.name === 'pistas_s3.csv')?.data || null,
};
```

### 3. Mapeamento aos Municípios (`RotasComponent.tsx`)

```typescript
// Criar mapa de pistas por código IBGE
const pistasPorCodigo = new Map<string, PistaVoo[]>();

pistasData.forEach((pista: any) => {
  const codigo = pista.codigo || pista.codigo_ibge;
  // ... processamento
  pistasPorCodigo.get(codigo)!.push(pistaObj);
});

// Ao processar municípios
const pistasDoMunicipio = pistasPorCodigo.get(municipio.codigo) || [];
```

### 4. Componente de Seleção (`SeletorPistas.tsx`)

Interface visual para o usuário escolher qual pista usar quando há múltiplas opções:

```tsx
<SeletorPistas
  municipio={polo}
  pistaSelecionada={poloSelecionado?.pistaSelecionada}
  onSelecionarPista={(pista) => {
    // Atualiza pista selecionada
  }}
/>
```

**Features:**
- Exibe todas as pistas disponíveis do município
- Indica pistas **com coordenadas** (✈️) e **sem coordenadas** (⚠️)
- Permite selecionar "Centro do município" como fallback
- Mostra tipo de pista (Pública/Privada)

### 5. Cálculo de Distâncias (`routingUtils.ts`)

A função `criarTrechoVoo` foi modificada para usar coordenadas de pistas quando disponíveis:

```typescript
export function criarTrechoVoo(
  origem: MunicipioPolo,
  destino: MunicipioPolo,
  configuracao: ConfiguracaoRota
): TrechoVoo {
  // Determinar coordenadas de origem
  let coordOrigem = origem.coordenadas;
  let usaPistaOrigem = false;
  
  if (origem.pistaSelecionada && 
      origem.pistaSelecionada.latitude_pista && 
      origem.pistaSelecionada.longitude_pista) {
    coordOrigem = origem.pistaSelecionada.coordenadas;
    usaPistaOrigem = true;
  }
  
  // Mesmo processo para destino...
  
  // Calcular distância com coordenadas determinadas
  const distancia = calcularDistanciaHaversine(coordOrigem, coordDestino);
  
  // Determinar método de cálculo
  let metodoCalculo: 'pista-pista' | 'pista-municipio' | 'municipio-pista' | 'municipio-municipio';
  // ...
  
  return {
    // ... campos
    usaPistaOrigem,
    usaPistaDestino,
    metodoCalculo
  };
}
```

## 📱 Interface do Usuário

### Seleção de Polos com Pistas

1. Usuário seleciona um polo no painel lateral
2. Se o polo tem pistas, aparece um dropdown "Selecionar Pista de Voo"
3. Opções disponíveis:
   - **Centro do município** (padrão)
   - **Lista de pistas** com indicadores:
     - ✈️ Pista com coordenadas (cálculo preciso)
     - ⚠️ Pista sem coordenadas (haversine do centro)

### Indicadores Visuais nos Resultados

Ao calcular a rota, cada trecho de voo exibe:

- **✈️ Pista → Pista (cálculo preciso)**: Verde - ambas pistas com coordenadas
- **✈️ Pista → 📍 Centro (cálculo parcial)**: Âmbar - origem tem pista, destino não
- **📍 Centro → ✈️ Pista (cálculo parcial)**: Âmbar - destino tem pista, origem não
- **📍 Centro → Centro (haversine)**: Cinza - nenhuma pista selecionada

## 🔄 Fluxo de Funcionamento

```
1. Usuário seleciona polos e periferias
   ↓
2. Para cada polo selecionado com pistas:
   - Aparece dropdown de seleção de pista
   - Usuário escolhe pista específica (ou mantém "Centro")
   ↓
3. Ao calcular rota:
   - Sistema verifica se há pistaSelecionada
   - Se sim E tem coordenadas: usa coordenadas da pista
   - Se não OU sem coordenadas: usa centro do município
   ↓
4. Cálculo de distância:
   - Haversine entre coordenadas determinadas
   - Registra método usado (metodoCalculo)
   ↓
5. Exibição dos resultados:
   - Lista de trechos com indicadores visuais
   - Código de cores por método de cálculo
   - Logs detalhados no console
```

## 🎨 Casos de Uso

### Caso 1: Ambos municípios têm pistas com coordenadas

```
João Pessoa (SBJP - Presidente Castro Pinto) → Campina Grande (SBKG)
Método: pista-pista
Indicador: ✈️ Pista → Pista (cálculo preciso) [VERDE]
```

### Caso 2: Origem tem pista, destino não

```
João Pessoa (SBJP) → Guarabira (sem pista)
Método: pista-municipio
Indicador: ✈️ Pista → 📍 Centro (cálculo parcial) [ÂMBAR]
```

### Caso 3: Município tem pista cadastrada sem coordenadas

```
Município X (Pista ABC - sem lat/lng) → Município Y
Sistema usa: Centro do Município X
Aviso visual: ⚠️ Pista sem coordenadas. Usando Haversine a partir do centro do município.
```

### Caso 4: Nenhuma pista selecionada

```
João Pessoa (centro) → Campina Grande (centro)
Método: municipio-municipio
Indicador: 📍 Centro → Centro (haversine) [CINZA]
```

## 🛠️ Logs de Desenvolvimento

O sistema emite logs detalhados para debugging:

```typescript
console.log('🛬 [RotasComponent] Pistas disponíveis:', pistasData.length);
console.log('🛬 [RotasComponent] Municípios com pistas:', pistasPorCodigo.size);
console.log('✈️ [criarTrechoVoo] Usando pista de origem: SBCZ em Cruzeiro do Sul');
console.log('⚠️ [criarTrechoVoo] Município X tem 2 pista(s), mas nenhuma selecionada.');
console.log('📏 [criarTrechoVoo] João Pessoa → Campina Grande: 120.5km (método: pista-pista)');
```

## 🧪 Testes Recomendados

1. **Teste com pistas completas:**
   - Selecionar 2 polos com pistas cadastradas com coordenadas
   - Verificar cálculo pista-pista

2. **Teste com pistas sem coordenadas:**
   - Selecionar polo com pista sem lat/lng
   - Verificar aviso e uso de centro do município

3. **Teste de múltiplas pistas:**
   - Selecionar município com 2+ pistas
   - Alternar entre pistas no dropdown
   - Verificar mudança no cálculo

4. **Teste sem seleção de pista:**
   - Selecionar polo com pistas mas não escolher nenhuma
   - Verificar uso do centro do município

5. **Teste misto:**
   - Rota com 3 polos: um com pista, outro sem, outro com pista sem coordenadas
   - Verificar métodos de cálculo diferentes em cada trecho

## 📝 Notas Técnicas

1. **Performance:** O mapeamento de pistas é feito em memória usando `Map<string, PistaVoo[]>` para lookup O(1)
2. **Coordenadas vazias:** Sistema trata `0` ou `undefined` como ausência de coordenadas
3. **Seleção de pista:** Estado armazenado no objeto do município (`pistaSelecionada`)
4. **Compatibilidade:** Funciona com municípios sem pistas (campo `pistas` opcional)
5. **Cache:** Dados de pistas seguem o mesmo sistema de cache dos outros dados do S3

## 🚀 Próximas Evoluções Possíveis

- [ ] Filtrar pistas por tipo (pública/privada)
- [ ] Sugerir automaticamente pista mais próxima do centro do município
- [ ] Exibir informações adicionais das pistas (comprimento de pista, tipo de pavimento, etc.)
- [ ] Validar códigos ICAO contra base ANAC/DECEA
- [ ] Geocodificação reversa para pistas sem coordenadas
- [ ] Estatísticas de uso de pistas no resumo da rota

## 📚 Arquivos Modificados

1. `src/types/routing.ts` - Tipos TypeScript
2. `src/components/routing/SeletorPistas.tsx` - Componente de seleção (novo)
3. `src/components/routing/RotasComponent.tsx` - Interface principal
4. `src/utils/routingUtils.ts` - Lógica de cálculo
5. `src/contexts/MapDataContext.tsx` - Carregamento de dados
6. `docs/INTEGRACAO_PISTAS_VOO.md` - Documentação (este arquivo)

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀

**Última atualização:** Outubro 2025 - Integração completa de pistas de voo implementada

