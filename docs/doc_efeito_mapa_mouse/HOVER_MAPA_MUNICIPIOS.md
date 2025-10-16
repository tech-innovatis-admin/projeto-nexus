# Hover de Municípios no Mapa — Documentação e QA

## 📋 Visão Geral

Implementação de hover interativo nos polígonos municipais do mapa Leaflet, com tooltips informativos (UF, Código IBGE, Nome do Município) e realce visual. A solução é:

- **Responsiva**: Funciona em desktop (hover) e mobile (tap/click)
- **Acessível**: Contraste AA+, sem interferência no fluxo de navegação
- **Performática**: Sem setInterval, idempotente, clean listeners
- **Modular**: Lógica isolada em `mapHoverHandlers.ts`, fácil de estender
- **Temática**: Usa variáveis CSS centralizadas, sem hardcoding de cores

---

## 🎨 Componentes Implementados

### 1. **Variáveis CSS** (`src/app/globals.css`)

```css
:root {
  /* Tokens de design para hover */
  --map-hover-stroke: #2563eb;          /* Azul médio (bordas) */
  --map-hover-fill: #bfdbfe;            /* Azul claro (preenchimento) */
  
  /* Cores do tooltip */
  --map-tooltip-bg: #f8fafc;            /* Fundo claro */
  --map-tooltip-text: #0f172a;          /* Texto escuro */
  --map-tooltip-border: #2563eb;        /* Borda azul */
}
```

**Pontos de extensão:**
- Altere `--map-hover-*` para mudar cores de realce globalmente
- Altere `--map-tooltip-*` para redesenhar o tooltip
- Fallbacks aplicados automaticamente se CSS var não existir

### 2. **Classes CSS** (`.muni-tooltip`, `.t-muni`, `.t-row`, etc.)

**Arquivo:** `src/app/globals.css` (linhas ~394-475)

**Características:**
- Sem `!important` (CSS limpo, fácil de sobrescrever)
- `pointer-events: none` → não interfere no hover do polígono
- Fonte pequena (12px) e compacta para leitura rápida
- Transformações dinâmicas (`.leaflet-tooltip-start/end`) para evitar bordas

**Estrutura HTML do tooltip:**
```html
<div class="t-muni">
  <div class="t-title">São Paulo</div>
  <div class="t-row">UF: <b>SP</b></div>
  <div class="t-row">IBGE: <b>3550308</b></div>
</div>
```

---

## 🛠️ Módulo Utilitário (`src/utils/mapHoverHandlers.ts`)

### Funções Principais

#### `extractMuniFields(properties: MuniProps): MuniFields`

Extrai UF, IBGE e Nome com múltiplos fallbacks para tolerância de esquemas:

```typescript
const fields = extractMuniFields({
  nome_municipio: "São Paulo",
  name_state: "SP",
  code_muni: 3550308
});
// { uf: "SP", ibge: "3550308", nome: "São Paulo" }
```

**Fallbacks testados (ordem de preferência):**
- **UF:** `UF`, `uf`, `sigla_uf`, `UF_origem`, `UF_destino`, `name_state`, `state`, `STATE`
- **IBGE:** `code_muni`, `codigo_ibge`, `cod_ibge`, `CD_MUN`, `COD_MUNIC`, `codigo_ibge7`, `codigo_ibge_7`, `IBGE`
- **Nome:** `nome`, `nome_munic`, `nome_municipio`, `NM_MUN`, `NM_MUNICIP`, `municipio`, `MUNICIPIO`

#### `muniTooltipHtml(properties: MuniProps): string`

Gera HTML do tooltip com escape XSS:

```typescript
muniTooltipHtml({ nome_municipio: "São Paulo", name_state: "SP", code_muni: 3550308 })
// Retorna HTML seguro com classe "t-muni" e subitens
```

#### `getHoverStyle(): L.PathOptions`

Retorna estilos de hover via CSS vars com fallbacks:

```typescript
{
  weight: 2.5,
  color: "#2563eb",      // De --map-hover-stroke
  fillColor: "#bfdbfe",  // De --map-hover-fill
  fillOpacity: 0.35
}
```

#### `attachMuniHoverHandlers(parentGeo: L.GeoJSON): onEachFeature`

Anexa listeners a um layer individual:

- **mouseover:** aplica `getHoverStyle()`, chama `bringToFront()`
- **mouseout:** chama `parentGeo.resetStyle()` (sem resíduos)
- **click:** abre tooltip (fallback para touch)

```typescript
// Uso direto em onEachFeature
L.geoJSON(data, {
  onEachFeature: attachMuniHoverHandlers(geoJsonInstance)
})
```

#### `applyMuniHoverToLayer(geoJsonLayer: L.GeoJSON): void`

Aplica handlers a todos os layers de uma camada (útil pós-`addData`):

```typescript
applyMuniHoverToLayer(layersRef.current.dados);
```

#### `readCssVar(varName: string, fallback: string): string`

Lê CSS var com SSR safety:

```typescript
readCssVar("--map-hover-stroke", "#2563eb")
// Retorna valor da var ou fallback (safe em SSR)
```

#### `removeMuniHoverHandlers(layer: L.Layer): void`

Remove listeners (cleanup, evita memory leaks):

```typescript
removeMuniHoverHandlers(layer);
```

---

## 🔌 Integração no MapaMunicipal.tsx

### Import
```typescript
import { attachMuniHoverHandlers, applyMuniHoverToLayer } from "../utils/mapHoverHandlers";
```

### Aplicação nas Camadas

**Dados Gerais:**
```typescript
layersRef.current.dados = L.geoJSON(mapData.dados, {
  style: /* ... */,
  onEachFeature: /* ... */
});
applyMuniHoverToLayer(layersRef.current.dados as L.GeoJSON);
```

**Produtos:**
```typescript
layersRef.current.produtos = L.geoJSON(mapData.produtos, {
  style: /* ... */,
  onEachFeature: /* ... */
});
applyMuniHoverToLayer(layersRef.current.produtos as L.GeoJSON);
```

---

## ✅ Checklist de QA

### 1. **Funcionalidade Básica**
- [ ] Passe o mouse sobre polígonos → tooltip mostra UF, IBGE, Nome
- [ ] Realce visual aplica-se (bordas + preenchimento azul claro)
- [ ] Ao sair do hover → realce remove-se sem resíduos
- [ ] Em mobile → tap abre tooltip, tap em outro fecha anterior

### 2. **Robustez de Dados**
- [ ] Teste com diferentes esquemas de propriedades:
  - `nome_municipio` + `name_state` + `code_muni` (dados atuais)
  - `municipio` + `UF` + `codigo_ibge` (esquema alternativo)
  - Propriedades faltando → tooltip mostra "-"
- [ ] Municípios com nomes especiais (acentos, caracteres) → sem erro XSS

### 3. **Performance e Limpeza**
- [ ] Hover rápido em áreas densas (ex.: NE Brasil) → sem lag
- [ ] Console → sem memory leaks, sem setInterval residuais
- [ ] Mude de município selecionado → hover continua funcionando
- [ ] Ligar/desligar camadas (Dados Gerais, Produtos) → hover respeita visibilidade

### 4. **Acessibilidade**
- [ ] Tooltip legível em tema claro/escuro
- [ ] Contraste WCAG AA+ (testar com ferramentas como Contrast Ratio)
- [ ] Navegação por teclado não é quebrada
- [ ] Hover não interfere com clique/seleção de município

### 5. **Responsividade**
- [ ] Desktop: hover com mouse suave, tooltip segue cursor
- [ ] Tablet: tap abre tooltip, longo tap não ativa context menu
- [ ] Mobile: tap abre, tap fora fecha, sem conflitos com scroll
- [ ] Tooltip não vai fora da viewport (testar em bordas do mapa)

### 6. **Integração com Fluxo Existente**
- [ ] Busca por município ainda funciona (alt + busca → seleção + hover continua)
- [ ] Botão "Limpar" reseta seleção e tooltip
- [ ] Zoom automático não quebra hover
- [ ] Alfinete e destaque não interferem com tooltip

### 7. **Design e Temas**
- [ ] Cores combinam com tema atual (azul claro/médio)
- [ ] Tooltip não ficassombra excessiva (teste em diferentes iluminações)
- [ ] Fonte legível (Poppins 12px, 500 weight)
- [ ] Espaçamento e padding consistentes

---

## 🔮 Pontos de Extensão para Futuro

### Adicionar Novos Campos ao Tooltip

**Local:** `src/utils/mapHoverHandlers.ts` → `MuniFields` + `extractMuniFields` + `muniTooltipHtml`

Exemplo: Adicionar Região (Nord/NE/CW/S/SE):
```typescript
// 1. Update interface
export interface MuniFields {
  uf: string;
  ibge: string;
  nome: string;
  regiao?: string;  // Novo
}

// 2. Update extrator
const regiao = properties.regiao ?? properties.REGIAO ?? "-";

// 3. Update HTML
<div class="t-row">Região: <b>${escapeHtml(regiao)}</b></div>
```

### Customizar Cores Globalmente

**Local:** `src/app/globals.css` → variáveis `:root`

```css
:root {
  --map-hover-stroke: #dc2626;   /* Vermelho em vez de azul */
  --map-hover-fill: #fecaca;
  --map-tooltip-bg: #fef2f2;
}
```

Sem tocar em TypeScript! ✨

### Adicionar Novos Listeners (ex: Contexto Menu)

**Local:** `src/utils/mapHoverHandlers.ts` → `attachMuniHoverHandlers`

```typescript
layer.on("contextmenu", (e: any) => {
  L.popup()
    .setLatLng(e.latlng)
    .setContent(`<b>Menu Contexto:</b> ${nome}`)
    .openOn(parentGeo as any);
});
```

### Testes Unitários Simples

Criar `src/utils/__tests__/mapHoverHandlers.test.ts`:

```typescript
import { extractMuniFields, muniTooltipHtml } from "../mapHoverHandlers";

describe("extractMuniFields", () => {
  it("extrai com primary keys", () => {
    const fields = extractMuniFields({
      nome_municipio: "São Paulo",
      name_state: "SP",
      code_muni: 3550308
    });
    expect(fields.nome).toBe("São Paulo");
    expect(fields.uf).toBe("SP");
    expect(fields.ibge).toBe("3550308");
  });

  it("usa fallbacks para keys alternativas", () => {
    const fields = extractMuniFields({
      municipio: "Rio de Janeiro",
      UF: "RJ",
      codigo_ibge: 3304557
    });
    expect(fields.nome).toBe("Rio de Janeiro");
  });
});

describe("muniTooltipHtml", () => {
  it("escapa XSS", () => {
    const html = muniTooltipHtml({
      nome_municipio: "<script>alert(1)</script>",
      name_state: "SP",
      code_muni: 3550308
    });
    expect(html).not.toContain("<script>");
  });
});
```

---

## 📝 Estrutura de Arquivos

```
src/
├── app/
│   └── globals.css                 ← Variáveis CSS + classes .muni-tooltip
├── components/
│   └── MapaMunicipal.tsx           ← Import + aplicação de handlers
├── utils/
│   └── mapHoverHandlers.ts         ← Lógica (novo arquivo)
├── utils/__tests__/                ← Testes futuros
│   └── mapHoverHandlers.test.ts    ← Snapshot/unit tests
```

---

## 🐛 Troubleshooting

### Tooltip não aparece
- ✅ Confirme que `leaflet/dist/leaflet.css` está importado
- ✅ Confirme que classe `.muni-tooltip` tem `display` (não `hidden`)
- ✅ Verifique se `pointer-events: none` está impedindo click

### Realce fica após mouseout
- ✅ Confirme que `parentGeo.resetStyle(layer)` é chamado em `mouseout`
- ✅ Verifique se GeoJSON tem `.style` definido (base para reset)

### Hover não funciona em mobile
- ✅ Confirme que listener `click` abre tooltip
- ✅ Verifique `Leaflet.touch` está carregado (já é padrão em v1.9)

### CSS vars não lidas
- ✅ Confirme que `readCssVar()` é usado (não hardcoding)
- ✅ Verifique se valor está em `:root` ou elemento mais específico

---

## 🎓 Referências

- **Leaflet Tooltips:** https://leafletjs.com/reference.html#tooltip
- **Leaflet GeoJSON:** https://leafletjs.com/reference.html#geojson
- **CSS Custom Properties:** https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **WCAG Contrast:** https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

---

## 📞 Contato e Dúvidas

Para dúvidas sobre extensão, manutenção ou bugs, consulte os comentários no código:
- `mapHoverHandlers.ts` → Documentação de cada função
- `globals.css` → Comentários de variáveis e seletores
- `MapaMunicipal.tsx` → Integração e uso

Código sempre pronto para revisão e refatoração! ✨
