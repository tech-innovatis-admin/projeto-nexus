# 🎨 Produtos Detalhados - Card Layout

## Visão Geral

O card de **"Produtos Detalhados"** foi reformulado para exibir os valores individuais de cada produto no município selecionado usando um layout profissional com código de cores por categoria.

Este card aparece quando:
- ✅ Um município específico é selecionado
- ✅ Na página de `/polos` ao lado do card de "Valor Total"

---

## 📐 Estrutura do Layout

### Grid 5x2 (10 slots)

```
┌─────────────────────────────────────────┐
│        PRODUTOS DETALHADOS              │
│ Valores individuais por produto         │
├─────────────────────┬───────────────────┤
│ 🔵 REURB      │ R$ 50.000 │ 🟢 PMSB      │ R$ 75.000 │
├─────────────────────┼───────────────────┤
│ 🟡 IPTU Legal │ R$ 30.000 │ 🟢 Plano Dir │ R$ 45.000 │
├─────────────────────┼───────────────────┤
│ 🟢 Plano Des  │ R$ 20.000 │ 🔵 Start Lab │ R$ 25.000 │
├─────────────────────┼───────────────────┤
│ 🔵 Saber+     │ R$ 15.000 │ 🔵 EducaGame │ R$ 10.000 │
├─────────────────────┼───────────────────┤
│ 🔵 PVA        │ R$ 12.000 │ 🟣 PLHIS     │ R$ 8.000  │
└─────────────────────┴───────────────────┘
```

- **Linhas:** 5
- **Colunas:** 2 
- **Total de slots:** 10 (exibindo até 10 produtos)
- **Gap entre items:** 4px

---

## 🎨 Sistema de Categorias por Cores

Cada produto possui uma categoria que determina a cor do ponto indicador:

| Categoria | Cor | Hex | Produtos |
|-----------|-----|-----|----------|
| **Educação** | 🔵 Azul | `bg-blue-500` | Start Lab, Saber+, EducaGame, PVA |
| **Planejamento** | 🟢 Verde | `bg-green-500` | PMSB, Plano Diretor |
| **Ambiental** | 🟢 Esmeralda | `bg-emerald-500` | Plano Decenal, Desertificação |
| **Tributário** | 🟡 Amarelo | `bg-yellow-500` | IPTU Legal |
| **Habitacional** | 🟣 Roxo | `bg-purple-500` | PLHIS |
| **Regularização** | 🟦 Índigo | `bg-indigo-500` | REURB |

---

## 🏗️ Componentes Visuais

### 1. Header

```tsx
<div className="mb-3 text-center">
  <h3 className="text-lg font-semibold text-white">Produtos Detalhados</h3>
  <p className="text-xs text-slate-400">Valores individuais por produto no município</p>
</div>
```

- Título: **Produtos Detalhados**
- Subtítulo: **Valores individuais por produto no município**
- Alinhamento: **Centralizado**

### 2. Item do Produto

Cada item ocupa um slot do grid:

```tsx
<div className="flex items-center justify-between py-1.5 px-2 rounded-md border transition-colors 
  bg-slate-800/30 border-slate-700/20 hover:bg-slate-700/40">
  
  {/* Lado esquerdo: Dot + Label */}
  <div className="flex items-center gap-1.5 flex-1 min-w-0">
    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" /> {/* Ponto de cor */}
    <span className="text-xs font-medium text-slate-200 truncate">Start Lab</span>
  </div>
  
  {/* Lado direito: Valor */}
  <span className="text-xs font-semibold text-emerald-400 tabular-nums flex-shrink-0">
    R$ 25.000
  </span>
</div>
```

**Características:**
- ✅ Ponto colorido (2x2px, `rounded-full`)
- ✅ Label truncado com `title` para tooltip completo
- ✅ Valor em verde esmeralda (`text-emerald-400`)
- ✅ Espaçamento: `py-1.5 px-2`
- ✅ Hover effect: `hover:bg-slate-700/40`
- ✅ Valores formatados com `Intl.NumberFormat` (sem casas decimais)

### 3. Slot Vazio

Quando não há produto suficiente para preencher os 10 slots:

```tsx
<div className="flex items-center justify-between py-1.5 px-2 rounded-md border
  bg-slate-800/10 border-slate-700/10">
  <span className="text-xs text-slate-500 italic">-</span>
</div>
```

- Fundo mais pálido
- Traço "-" em cinza escuro

### 4. Sem Produtos

Quando não há nenhum produto com valor:

```
Nenhum produto ativo neste município
```

---

## 📊 Dados & Cálculos

### Dados de Entrada

Estrutura do objeto produto:

```typescript
{
  key: string;              // Chave única (ex: 'reurb', 'pmsb')
  nome: string;             // Nome completo (ex: 'REURB', 'Plano Municipal de Saneamento Básico')
  valor: number;            // Valor monetário
  category: string;         // Categoria para cor (ex: 'educacao', 'planejamento')
  shortLabel: string;       // Label curto exibido (ex: 'REURB', 'Start Lab')
}
```

### Processamento

1. **Filtragem:** Remove `valor_total`
2. **Extração:** Pega `valor` da propriedade do município
3. **Filtragem:** Remove produtos com `valor <= 0`
4. **Ordenação:** Ordena por valor descendente (maior primeiro)
5. **Slicing:** Usa até 10 primeiros itens
6. **Padding:** Preenche com 10 slots vazios

---

## 🎯 Integração com Config

### PRODUTOS_CONFIG (types.ts)

Cada produto em `PRODUTOS_CONFIG` agora inclui:

```typescript
{
  campo: string;        // Nome do campo na feature GeoJSON
  nome: string;         // Nome exibido
  descricao: string;    // Descrição completa
  category: string;     // Categoria para cor
}
```

**Exemplo:**
```typescript
educagame: {
  campo: 'educagame',
  nome: 'EducaGame',
  descricao: 'Plataforma Educacional Gamificada',
  category: 'educacao'  // Determina a cor azul
}
```

---

## 🔄 Fluxo de Dados

```
componente page.tsx
    ↓
computedData.produtosMunicipio (Array de produtos)
    ↓
Card renderiza Array.from({ length: 10 }, ...)
    ↓
Exibe até 10 produtos com cores e valores
```

---

## 📱 Responsividade

**Layout** é responsivo na página `/polos`:

- **Mobile:** 1 coluna (ocupando toda a largura)
- **Tablet (lg):** 2 colunas lado a lado
  - Coluna 1: Valor Total do Município
  - Coluna 2: Produtos Detalhados
- **Desktop:** Mantém layout 2 colunas

**Grid interno:** Sempre 5 linhas x 2 colunas (fixo)

---

## 🎨 Estilos Tailwind

| Elemento | Classe | Efeito |
|----------|--------|--------|
| Container | `grid grid-cols-2 grid-rows-5 gap-1` | Grid 5x2 com gap pequeno |
| Item (com valor) | `bg-slate-800/30 border-slate-700/20 hover:bg-slate-700/40` | Fundo translúcido + hover |
| Item (vazio) | `bg-slate-800/10 border-slate-700/10` | Mais pálido |
| Ponto de cor | `w-2 h-2 rounded-full bg-[cor]` | 2x2px circular |
| Label | `text-xs font-medium text-slate-200 truncate` | Pequeno + truncado |
| Valor | `text-xs font-semibold text-emerald-400 tabular-nums` | Verde, monoespaciado |

---

## ✨ Características

✅ **Código de cores intuitivo** - Categorias mapeadas a cores visuais
✅ **Layout fixo 5x2** - Consistente com `/estrategia`
✅ **Responsivo** - Se adapta a diferentes telas
✅ **Formatação monetária** - Localização brasileira (pt-BR)
✅ **Sem casas decimais** - Valores inteiros em R$
✅ **Hover effects** - Feedback visual interativo
✅ **Tooltip completo** - Exibe nome completo ao passar mouse
✅ **Ordenação inteligente** - Maiores valores primeiro
✅ **Padding inteligente** - 10 slots sempre, vazios quando necessário

---

## 🔗 Referências

### Arquivos Modificados

- [src/app/polos/page.tsx](src/app/polos/page.tsx) - Card layout e cálculo de dados
- [src/app/polos/types.ts](src/app/polos/types.ts) - Adição de `category` ao `PRODUTOS_CONFIG`

### Componentes Similares

- `/estrategia/page.tsx` (linhas 3529-3580) - Card original de Produtos Detalhados

---

## 💡 Notas de Desenvolvimento

1. **Categorias:** Mapeie sempre através de `config.category` em `PRODUTOS_CONFIG`
2. **Cores:** Mantenha as cores padrão (azul, verde, esmeralda, amarelo, roxo, índigo)
3. **Truncamento:** Use `truncate` + `title={produto.nome}` para labels longos
4. **Formatação:** Use `Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })`
5. **Slots vazios:** Sempre use 10 slots, preenchendo com items reais + vazios

