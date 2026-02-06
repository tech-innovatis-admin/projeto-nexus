# 📁 Estrutura da Pasta `/polos`

Documentação completa da arquitetura e organização da página de análise estratégica de produtos (Polos).

---

## 📊 Visão Geral

A pasta `/polos` implementa uma página de análise geográfica de municípios brasileiros com dados de produtos, permitindo visualização interativa em mapa, filtros avançados e gerenciamento de relacionamentos.

---

## 🗂️ Estrutura de Arquivos

```
src/app/polos/
├── layout.tsx                          # Layout específico com PolosDataProvider
├── page.tsx                            # Página principal
├── types.ts                            # Tipos TypeScript e configurações
├── ESTRUTURA.md                        # Este arquivo
│
└── _components/                        # Componentes reutilizáveis
    ├── MapaPolos.tsx                   # Mapa interativo com MapLibre GL
    ├── TooltipMunicipio.tsx            # Componente utilitário para tooltips
    ├── EstrategiaPoloFiltersMenu.tsx   # Menu de filtros (Radar + Relacionamento)
    ├── RelacionamentoModal.tsx         # Modal para gerenciar relacionamentos
    └── FiltrosMapaLibreGL.tsx          # Controles de filtros do mapa (se existir)
```

---

## 📄 Descrição dos Arquivos

### 1. **`layout.tsx`**
**Propósito:** Layout específico para a rota `/polos`

```tsx
export default function PolosLayout({ children }) {
  return (
    <PolosDataProvider>
      {children}
    </PolosDataProvider>
  );
}
```

- **Responsabilidade:** Envolver apenas a página de polos com o `PolosDataProvider`
- **Evita:** Carregar dados de polos em outras páginas
- **Benefício:** Isolamento de dados e melhor performance

---

### 2. **`page.tsx`**
**Propósito:** Página principal da análise de polos

**Componentes principais:**
- Header com título e menu de filtros
- Seção de filtros (Estado, Polo Estratégico, Municípios, Produtos)
- Cards de métricas (Valor Total, Top 3, Total de Municípios)
- Mapa interativo

**Estados gerenciados:**
```typescript
// Dados
const { polosData, loading, error, loadingProgress } = usePolosData();

// Filtros
const [isRadarActive, setIsRadarActive] = useState(false);
const [isRelActive, setIsRelActive] = useState(false);
const [isRelacionamentoModalOpen, setIsRelacionamentoModalOpen] = useState(false);

// UI
const [selectedMetric, setSelectedMetric] = useState('overview');
const [isCardFlipped, setIsCardFlipped] = useState(false);
const [currentPage, setCurrentPage] = useState(0);
```

**Dados Computados:**
```typescript
const computedData = useMemo(() => ({
  valorTotal: sum(all valor_total_produtos),
  totalMunicipios: features.length,
  top3: sorted features by valor_total_produtos,
  municipiosList: first 12 features
}), [polosData]);
```

---

### 3. **`types.ts`**
**Propósito:** Definições de tipos TypeScript e configurações

**Principais tipos:**
```typescript
interface MunicipioProperties {
  nome_municipio: string;
  name_state: string;
  code_muni: string | number;
  valor_total_produtos: number;
  valor_reurb_: number;
  valor_pmsb_num: number;
  // ... 10 produtos totais
}

interface MunicipioFeature extends GeoJSON.Feature {
  properties: MunicipioProperties;
}

interface MunicipiosGeoJSON extends GeoJSON.FeatureCollection {
  features: MunicipioFeature[];
}

interface MunicipioRelacionamento {
  row_index: number;
  name_state: string;
  code_muni: string;
  name_muni: string;
  relacionamento_ativo: boolean;
  relacionamento_criado: string | null;
  relacionamento_editado: string | null;
}
```

**Configuração de Produtos:**
```typescript
const PRODUTOS_CONFIG = {
  valor_total: { campo: 'valor_total_produtos', nome: 'Valor Total', ... },
  reurb: { campo: 'valor_reurb_', nome: 'Reurbano', ... },
  pmsb: { campo: 'valor_pmsb_num', nome: 'Plano Municipal de Saneamento', ... },
  // ... 7 produtos adicionais
};
```

---

## 🧩 Componentes

### **`_components/MapaPolos.tsx`**
**Responsabilidade:** Renderizar mapa interativo com municípios

**Funcionalidades:**
- Exibir GeoJSON de municípios em mapa MapLibre GL
- Estilo: positron (fundo branco)
- Cores dos polígonos: `#F5DF09` (amarelo)
- Opacidades: 0.7 (base), 0.5 (hover)
- Eventos de interação:
  - **Hover:** Muda opacidade e cor da borda
  - **Click:** Exibe tooltip com informações do município
  - **Visibility toggle:** Mostrar/ocultar municípios

**Props:**
```typescript
interface MapaPolosProps {
  baseMunicipios: MunicipiosGeoJSON | null;
}
```

**Estrutura do Mapa:**
```
- Map Container
  ├── GeoJSON Source (municipios-src)
  │   ├── Layer: municipios-fill (preenchimento com cores)
  │   └── Layer: municipios-line (contorno)
  ├── Popup (tooltip com informações)
  ├── Controles
  │   ├── Checkbox: Mostrar Municípios
  │   └── Contador: Total de municípios visíveis
```

---

### **`_components/TooltipMunicipio.tsx`**
**Responsabilidade:** Gerar HTML formatado para tooltips de municípios

**Exports:**
```typescript
export function gerarTooltipMunicipio(props: MunicipioTooltipData): string
export const TOOLTIP_CONFIG = { closeButton: true, closeOnClick: true, ... }
```

**Conteúdo do Tooltip:**
- Nome do município (título)
- Estado (UF)
- Valor Total de Produtos (formatado em BRL com separador de milhares)

**Exemplo:**
```
┌─────────────────────────┐
│  São Paulo              │
├─────────────────────────┤
│ UF: SP                  │
├─────────────────────────┤
│ Valor Total Produtos    │
│ R$ 2.500.000,00         │
└─────────────────────────┘
```

---

### **`_components/EstrategiaPoloFiltersMenu.tsx`**
**Responsabilidade:** Menu de filtros do mapa com Radar e Relacionamento

**Props:**
```typescript
interface EstrategiaFiltersMenuProps {
  isRadarActive: boolean;
  setIsRadarActive: (v: boolean) => void;
  isRelActive: boolean;
  setIsRelActive: (v: boolean) => void;
  onOpenRelacionamentoModal?: () => void;
}
```

**Filtros Disponíveis:**
1. **Radar Estratégico** - Toggle para ativar raio de 1.300 km
2. **Relacionamento** - Toggle + botão para editar relacionamentos

**Estilo:** 
- Background: `#0f172a` com border `slate-700/60`
- Indicador de filtros ativos com badge

---

### **`_components/RelacionamentoModal.tsx`**
**Responsabilidade:** Modal para gerenciar relacionamentos de municípios

**Props:**
```typescript
interface RelacionamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  municipiosDisponiveis?: MunicipioDisponivel[];
}
```

**Funcionalidades:**
- **Adicionar relacionamento:** Select UF + Combobox município
- **Listar relacionamentos:** Tabela com filtros por UF e busca
- **Toggle ativo/inativo:** Ativar ou desativar relacionamentos
- **Gerenciamento:** Criar, editar, desativar relacionamentos

**Estrutura do Modal:**
```
┌──────────────────────────────────────────────┐
│ Gerenciar Relacionamentos                    │
├──────────────────────────────────────────────┤
│ Adicionar Novo Relacionamento                │
│ [UF Dropdown] [Município Combobox] [Btn]    │
├──────────────────────────────────────────────┤
│ Filtros da Tabela                            │
│ [UF Filter] [Search] [Apenas Ativos]        │
├──────────────────────────────────────────────┤
│ Tabela de Relacionamentos (scrollável)       │
│ ┌─────┬──────────┬────────────┬─────────┐   │
│ │ UF  │ Municipio│ Ativo      │ Ações   │   │
│ └─────┴──────────┴────────────┴─────────┘   │
├──────────────────────────────────────────────┤
│ [Total: X ativos de Y cadastrados] [Fechar] │
└──────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados

### **1. Inicialização**
```
page.tsx monta
    ↓
layout.tsx ativa PolosDataProvider
    ↓
PolosDataContext.loadPolosData() chamado
    ↓
/api/polos/data executado
    ↓
Promise.all([S3, PostgreSQL])
    ├── Fetch base_municipios.geojson (S3)
    └── Query municipios_com_relacionamento (PostgreSQL)
    ↓
Dados armazenados em useState + localStorage
```

### **2. Renderização**
```
Dados recebidos
    ↓
computedData calculado (useMemo)
    ↓
Metrics calculadas (valorTotal, top3, etc)
    ↓
Componentes renderizados
    ├── Cards com animações
    ├── MapaPolos com GeoJSON
    └── Filtros ativados
```

### **3. Interação do Mapa**
```
Usuário interage com polígono
    ↓
Hover → Altera estado visual (opacidade 0.5)
Click → Exibe tooltip com gerarTooltipMunicipio()
    ↓
MapLibre renderiza mudanças
    ↓
Tooltip posicionado no cursor
```

---

## 📡 Fontes de Dados

### **AWS S3**
- **Arquivo:** `base_municipios.geojson`
- **Conteúdo:** 5.570+ features (municípios brasileiros)
- **Propriedades:** Nome, UF, código, 10 valores de produtos
- **Estrutura:** FeatureCollection GeoJSON com geometria de polígonos

### **PostgreSQL**
- **Tabela:** `municipios_com_relacionamento`
- **Conteúdo:** Relacionamentos ativos entre municípios
- **Campos:** `row_index`, `name_state`, `code_muni`, `name_muni`, `relacionamento_ativo`, timestamps
- **Uso:** Filtro e gerenciamento de relacionamentos

### **API Endpoint**
- **URL:** `/api/polos/data`
- **Método:** GET
- **Response:**
```json
{
  "baseMunicipios": { "type": "FeatureCollection", "features": [...] },
  "municipiosRelacionamento": [...],
  "metadata": {
    "totalMunicipios": 5570,
    "totalRelacionamentos": 123,
    "loadedAt": "2025-02-05T10:30:00Z"
  }
}
```

---

## ⚙️ Configuração & Performance

### **Cache**
- **Tipo:** localStorage
- **Chave:** `polos_data_cache_v1`
- **TTL:** 30 dias
- **Estratégia:** Serve cache se fresco, sem revalidação em background

### **Loading States**
- **Spinner:** Animação de rotação com ícone
- **Progress Bar:** Barra visual 0-100%
- **Mensagem:** "Carregando dados..." com percentual

### **Otimizações**
1. **Dynamic Import:** MapaPolos carregado sem SSR (client-side only)
2. **useMemo:** Computação de métricas memoizada
3. **Parallel Fetching:** S3 + PostgreSQL em Promise.all()
4. **Feature State Management:** MapLibre feature-state para hover eficiente
5. **Lazy Loading:** Cards com animações de entrada

---

## 🎨 Estilo & Design

### **Cores**
- **Fundo:** `from-[#0f172a] to-[#1e293b]` (dark gradient)
- **Polígonos:** `#F5DF09` (amarelo)
- **Polígonos (hover):** Opacidade reduzida
- **Borders:** `slate-700/50`
- **Texto:** `slate-300` / `text-white`

### **Layout**
- **Header:** 3xl título com cor destaque
- **Cards:** Grid 3 colunas (lg), animações Framer Motion
- **Mapa:** Height 450px, rounded-xl
- **Filtros:** Grid 5 colunas com inputs

---

## 🔌 Dependências Principais

```json
{
  "maplibre-gl": "^4.x - Renderização de mapas",
  "framer-motion": "^11.x - Animações",
  "tailwindcss": "^3.x - Estilos",
  "@prisma/client": "^5.x - ORM PostgreSQL",
  "next": "^15.x - Framework"
}
```

---

## 📝 Fluxo de Trabalho Típico

### **Usuário acessa `/polos`**
1. Layout renderiza com PolosDataProvider
2. usePolosData() chamado
3. API `/api/polos/data` busca dados
4. Cache verifica e armazena dados
5. Página renderiza com dados reais
6. MapaPolos exibe municípios em amarelo

### **Usuário interage com filtros**
1. Clica em checkbox Radar Estratégico
2. Estado `isRadarActive` atualiza
3. Componente re-renderiza (se implementado)
4. Mapa pode exibir raio visual (se implementado)

### **Usuário clica em município**
1. Evento `click` disparado em `municipios-fill` layer
2. Coordenadas e propriedades capturadas
3. `gerarTooltipMunicipio()` gera HTML
4. MapLibre Popup criado e renderizado
5. Tooltip exibe nome, UF e valor

### **Usuário abre modal de relacionamento**
1. Clica botão "Gerenciar" no menu de filtros
2. Modal abre com `isRelacionamentoModalOpen=true`
3. Lista de relacionamentos carregada via API
4. Usuário pode adicionar/remover/editar
5. Dados persistem no PostgreSQL

---

## 🧪 Testes Recomendados

- [ ] Verificar carregamento de dados via API
- [ ] Testar hover effects no mapa
- [ ] Testar click e exibição de tooltip
- [ ] Testar toggle de visibilidade de municípios
- [ ] Testar filtro de Radar Estratégico
- [ ] Testar abertura do modal de relacionamento
- [ ] Testar adicionar/remover relacionamentos
- [ ] Testar cache com localStorage
- [ ] Testar responsividade em mobile
- [ ] Testar performance com 5.570+ features

---

## 📌 Notas Importantes

1. **PolosDataProvider é local:** Só funciona dentro de `/polos/layout.tsx`, não carrega em outras páginas
2. **MapaPolos sem SSR:** Renderizado apenas no cliente para evitar erros com maplibre-gl
3. **Tooltip sob demanda:** Só exibido ao clicar, não ao hover (padrão MapLibre)
4. **Dados imutáveis no cache:** Cache é apenas leitura, não atualiza em background
5. **Modal é portal:** Renderizado no body via createPortal

---

## 🚀 Próximos Passos

- [ ] Implementar filtro de Radar Estratégico visual no mapa
- [ ] Implementar filtros de Estado/Polo/Municípios ativos
- [ ] Implementar filtro de produtos por tipo
- [ ] Implementar busca de municípios
- [ ] Adicionar export de dados
- [ ] Implementar analytics de cliques
- [ ] Otimizar performance para 10k+ features
- [ ] Adicionar suporte a múltiplas seleções no mapa

---

**Última atualização:** Fevereiro 5, 2026
**Versão:** 1.0
