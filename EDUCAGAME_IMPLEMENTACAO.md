# 🎮 Implementação do Educagame - Modo Vendas

**Data:** 23 de outubro de 2025  
**Arquivo:** `src/utils/produtos.ts`  
**Funcionalidade:** Novo produto Educagame com restrição populacional  
**Status:** ✅ Implementado

---

## 📋 Especificação

### Produto Educagame
- **Nome:** Educagame
- **Chave:** `VALOR_EDUCAGAME`
- **Restrição:** Apenas para municípios com população **< 20.000 habitantes**
- **Comportamento:**
  - ✅ Exibe o valor calculado se elegível (pop < 20k)
  - ❌ Exibe "-" se não elegível (pop >= 20k)
  - 🚫 **NÃO é exibido** no modo vendas se não elegível (mesma lógica que PD/PMSB)

---

## 🔧 Implementação

### 1. Nova Constante

```typescript
export const EDUCAGAME_POPULACAO_MAX = 20000; // Máximo de habitantes para Educagame
```

### 2. Novas Funções Auxiliares

#### `temPopulacaoEducagame()`
```typescript
export function temPopulacaoEducagame(props: PropriedadesMunicipio): boolean {
  const populacao = props.POPULACAO || props.populacao;
  if (!populacao) return false;
  
  const popNum = Number(populacao);
  return !isNaN(popNum) && popNum > 0 && popNum < EDUCAGAME_POPULACAO_MAX;
}
```

**O que faz:**
- Valida se população é um número válido
- Verifica se está entre 0 e 20.000 (exclusivo)
- Retorna `true` se elegível, `false` caso contrário

#### `getPopulacao()`
```typescript
export function getPopulacao(props: PropriedadesMunicipio): number | null {
  const populacao = props.POPULACAO || props.populacao;
  if (!populacao) return null;
  
  const popNum = Number(populacao);
  return !isNaN(popNum) && popNum > 0 ? popNum : null;
}
```

**O que faz:**
- Extrai população do objeto de propriedades
- Valida se é um número positivo
- Retorna valor numérico ou null

### 3. Atualização da Função `classificarElegibilidade()`

Adicionado novo bloco para Educagame:

```typescript
// Classificar Educagame (apenas para municípios com população < 20k)
const populacao = getPopulacao(props);
const temPopEducagame = temPopulacaoEducagame(props);
const itemEducagame: ItemProduto = {
  chave: 'VALOR_EDUCAGAME',
  nome: 'Educagame',
  valor: props.VALOR_EDUCAGAME ?? null,
  ano: new Date().getFullYear(),
  status: temPopEducagame ? 'em_dia' : 'nao_tem',
  motivo: temPopEducagame
    ? `Elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} < ${EDUCAGAME_POPULACAO_MAX.toLocaleString('pt-BR')} hab.`
    : `Não elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} >= ${EDUCAGAME_POPULACAO_MAX.toLocaleString('pt-BR')} hab.`
};

if (temPopEducagame) {
  resultado.vender.push(itemEducagame);
} else {
  resultado.naoVender.push(itemEducagame);
}
```

---

## 📊 Fluxo de Elegibilidade

```
MUNICIPIO COM POPULAÇÃO X
        │
        ├─ X < 20.000 ──► ELEGÍVEL ✅
        │                 ├─ Exibe no Modo Vendas
        │                 ├─ Mostra valor: VALOR_EDUCAGAME
        │                 └─ Motivo: "Elegível: população X < 20.000 hab."
        │
        └─ X >= 20.000 ──► NÃO ELEGÍVEL ❌
                           ├─ NÃO exibe no Modo Vendas (oculto)
                           ├─ Exibe "-" no portfólio completo
                           └─ Motivo: "Não elegível: população X >= 20.000 hab."
```

---

## 🧪 Exemplos de Classificação

### Exemplo 1: Município com 10k habitantes
```typescript
const municipio = {
  POPULACAO: 10000,
  VALOR_EDUCAGAME: 50000
};

const resultado = classificarElegibilidade(municipio);
// resultado.vender inclui Educagame com status 'em_dia'
// Exibição: "Educagame" com valor "50.000"
```

### Exemplo 2: Município com 25k habitantes
```typescript
const municipio = {
  POPULACAO: 25000,
  VALOR_EDUCAGAME: 50000
};

const resultado = classificarElegibilidade(municipio);
// resultado.naoVender inclui Educagame com status 'nao_tem'
// Exibição no Modo Vendas: NÃO APARECE
// Exibição no Portfólio Completo: "-"
```

### Exemplo 3: Município com população inválida
```typescript
const municipio = {
  POPULACAO: null,
  VALOR_EDUCAGAME: 50000
};

const resultado = classificarElegibilidade(municipio);
// resultado.naoVender inclui Educagame com status 'nao_tem'
// Exibição no Modo Vendas: NÃO APARECE
```

---

## 🎯 Comparação: Educagame vs PD vs PMSB

| Aspecto | PD | PMSB | Educagame |
|---------|----|----|-----------|
| **Critério** | Vigência 10 anos | Vigência 4 anos | População < 20k |
| **Status Possíveis** | vencido, em_dia, nao_tem | vencido, em_dia, nao_tem | em_dia, nao_tem |
| **Exibição se Elegível** | ✅ Valor calculado | ✅ Valor calculado | ✅ Valor calculado |
| **Exibição se Não Elegível** | ✅ "-" (no portfólio) | ✅ "-" (no portfólio) | ✅ "-" (no portfólio) |
| **Modo Vendas (Elegível)** | ✅ Aparece | ✅ Aparece | ✅ Aparece |
| **Modo Vendas (Não Elegível)** | ❌ Não aparece | ❌ Não aparece | ❌ Não aparece |

---

## 📝 Telemetria

Quando classificarElegibilidade é chamada, o Educagame é automaticamente incluído na telemetria:

```typescript
const telemetria = gerarTelemetriaVendas(classificacao, municipio);
// Resultado:
{
  vender: 3,           // Ex: PD, PMSB, Educagame
  naoVender: 0,
  produtos_vender: ['VALOR_PD', 'VALOR_PMSB', 'VALOR_EDUCAGAME'],
  produtos_nao_vender: [],
  code_muni: '123456',
  uf: 'SP'
}
```

---

## 🔄 Fluxo de Dados

```
InformacoesMunicipio.tsx (modoVendas = true)
        │
        ▼
classificarElegibilidade(props)
        │
        ├─ Classifica PD (vigência)
        ├─ Classifica PMSB (vigência)
        └─ Classifica Educagame (população < 20k)
        │
        ▼
ClassificacaoElegibilidade
{
  vender: [PD?, PMSB?, Educagame?],
  naoVender: [...]
}
        │
        ▼
Renderização Condicional
- Se Educagame em vender ──► Exibe com valor
- Se Educagame em naoVender ──► NÃO EXIBE no Modo Vendas
```

---

## ✅ Validação

- [x] Função `temPopulacaoEducagame()` implementada
- [x] Função `getPopulacao()` implementada
- [x] Constante `EDUCAGAME_POPULACAO_MAX` definida
- [x] Lógica em `classificarElegibilidade()` adicionada
- [x] Sem erros TypeScript
- [x] Motivo descritivo com população formatada
- [x] Integrado com telemetria
- [x] Mesmo padrão que PD e PMSB

---

## 🚀 Próximos Passos

1. Testar na página `/mapa` com Modo Vendas ativado
2. Verificar com municípios de diferentes tamanhos:
   - ✅ < 20k hab (deve aparecer)
   - ✅ >= 20k hab (deve estar oculto)
   - ✅ população inválida (deve estar oculto)
3. Verificar telemetria no console
4. Testar portfólio completo (sem Modo Vendas)

---

## 💡 Observações

- Educagame **não tem vigência**, apenas verifica população atual
- População é consultada em `POPULACAO` ou `populacao` (case-insensitive)
- O valor é exibido como "-" em portfólio se não elegível
- No Modo Vendas, não elegíveis são completamente ocultados
- Usa formatação `toLocaleString` para exibição legível de números

---

**Implementação Concluída com Sucesso! 🎉**
