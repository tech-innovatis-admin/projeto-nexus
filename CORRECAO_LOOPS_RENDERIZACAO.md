# Correção de Loops de Renderização na Página /estrategia

## 📋 Resumo da Correção

Esta correção resolve os **loops de renderização infinitos** e **crashes de memória** identificados na página `/estrategia` do projeto NEXUS. O problema estava causando dezenas de re-renders consecutivos (render #35, #36, etc.) que levavam ao travamento do navegador.

---

## 🔍 Problemas Identificados

### 1. **Funções Recriadas a Cada Render**
- `callWorker`: Função `useCallback` que mudava de referência devido a closures internas
- `filterByJoaoPessoaRadius`: Função `useCallback` que dependia de `isJoaoPessoaFilterActive`

**Impacto**: Toda vez que essas funções eram recriadas, os `useEffect` dependentes eram re-executados, disparando novamente os Workers, que atualizavam estados, causando nova renderização, criando um **loop infinito**.

### 2. **useEffect Sem Verificações de Redundância**
- `useEffect` para `AGG_PERIFERIA_BY_CODIGO`: Executava mesmo quando os parâmetros não mudavam
- `useEffect` para `FILTER_AND_SORT_POLOS`: Sem controle de duplicatas

**Impacto**: Chamadas redundantes ao Worker em cada re-render, mesmo sem mudança real nos dados.

### 3. **Dependências Circulares**
- Efeitos dependiam de funções que dependiam de estados
- Estados eram atualizados pelos efeitos, criando ciclo vicioso

---

## ✅ Soluções Implementadas

### 1. **Estabilização de `callWorker` com useRef**

**Antes:**
```typescript
const callWorker = useCallback((type: string, payload: any): Promise<any> => {
  // Lógica direta no callback
  return new Promise((resolve, reject) => {
    // ... código ...
  });
}, []);
```

**Depois:**
```typescript
// useRef para manter referência estável
const callWorkerRef = useRef<(type: string, payload: any) => Promise<any>>(null as any);

// useEffect para atualizar lógica sem mudar referência
useEffect(() => {
  callWorkerRef.current = (type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      // ... lógica idêntica ...
    });
  };
}, []); // Sem dependências - lógica não muda

// useCallback estável que delega para o ref
const callWorker = useCallback((type: string, payload: any) => {
  if (!callWorkerRef.current) {
    return Promise.reject(new Error('Worker not initialized'));
  }
  return callWorkerRef.current(type, payload);
}, []); // Sem dependências - sempre a mesma referência
```

**Benefício**: `callWorker` **nunca muda de referência**, eliminando re-execuções desnecessárias dos efeitos.

---

### 2. **Estabilização de `filterByJoaoPessoaRadius` com useRef**

**Antes:**
```typescript
const filterByJoaoPessoaRadius = useCallback((municipios) => {
  if (!isJoaoPessoaFilterActive) return municipios;
  // ... filtros geoespaciais ...
}, [isJoaoPessoaFilterActive]); // Dependência que causava recriação
```

**Depois:**
```typescript
// useRef para manter referência estável
const filterByJoaoPessoaRadiusRef = useRef<(municipios) => municipios[]>(null as any);

// useEffect para atualizar lógica quando necessário
useEffect(() => {
  filterByJoaoPessoaRadiusRef.current = (municipios) => {
    if (!isJoaoPessoaFilterActive) return municipios;
    // ... filtros geoespaciais ...
  };
}, [isJoaoPessoaFilterActive]); // Só atualiza quando o filtro muda

// useCallback estável que delega para o ref
const filterByJoaoPessoaRadius = useCallback((municipios) => {
  if (!filterByJoaoPessoaRadiusRef.current) return municipios;
  return filterByJoaoPessoaRadiusRef.current(municipios);
}, []); // Sem dependências - sempre a mesma referência
```

**Benefício**: Função estável que **não causa re-renders**, mas atualiza lógica interna quando `isJoaoPessoaFilterActive` muda.

---

### 3. **Verificação de Redundância em useEffect (AGG_PERIFERIA_BY_CODIGO)**

**Antes:**
```typescript
useEffect(() => {
  // Executava toda vez que dependências mudavam
  callWorker('AGG_PERIFERIA_BY_CODIGO', {...});
}, [periferia, appliedUFs, appliedPolo, appliedUF, appliedProducts, ...]);
```

**Depois:**
```typescript
const lastAggCallRef = useRef<string>('');

useEffect(() => {
  // ✅ Verificação 1: Não rodar se dados vazios
  if (!periferia.length) {
    dbg('⏭️ [AGG_PERIFERIA] Skipping: periferia vazia');
    return;
  }
  
  // ... processar filtros ...
  
  // ✅ Verificação 2: Criar hash dos parâmetros
  const callHash = JSON.stringify({
    baseLen: base.length,
    appliedProducts: appliedProducts.sort(),
    appliedPolo,
    appliedUF,
    appliedUFs: appliedUFs.sort(),
  });
  
  // ✅ Verificação 3: Pular se já executou com mesmos parâmetros
  if (lastAggCallRef.current === callHash) {
    dbg('⏭️ [AGG_PERIFERIA] Skipping: mesmos parâmetros');
    return;
  }
  
  lastAggCallRef.current = callHash;
  
  // Só agora chamar o Worker
  callWorker('AGG_PERIFERIA_BY_CODIGO', {...});
}, [...]);
```

**Benefício**: **Elimina chamadas redundantes** ao Worker, reduzindo de 10+ chamadas para 1-2 por ação do usuário.

---

### 4. **Verificação de Redundância em useEffect (FILTER_AND_SORT_POLOS)**

**Implementação idêntica ao `AGG_PERIFERIA_BY_CODIGO`:**
- Verificação se `poloOptions` está vazio
- Hash dos parâmetros (`basePolosLen`, `searchTermLower`, `restrictedCodes`)
- Pulo de execução se hash for igual ao anterior

**Benefício**: Mesma redução de chamadas redundantes ao Worker.

---

## 📊 Resultados Esperados

### Antes da Correção:
```
🧪[EstrategiaDBG] 🔁 render #35
🧮 FILTER_AND_SORT_POLOS input ...
📤 Worker chamada ...
📬 Worker resposta ...
🧪[EstrategiaDBG] 🔁 render #36
🧮 FILTER_AND_SORT_POLOS input ...
📤 Worker chamada ...
📬 Worker resposta ...
🧪[EstrategiaDBG] 🔁 render #37
...
[CRASH após ~50-100 renders]
```

### Depois da Correção:
```
🧪[EstrategiaDBG] 🔁 render #1
🧮 FILTER_AND_SORT_POLOS input ...
📤 Worker chamada ...
📬 Worker resposta ...
🧪[EstrategiaDBG] 🔁 render #2
⏭️ [FILTER_POLOS] Skipping: mesmos parâmetros
⏭️ [AGG_PERIFERIA] Skipping: mesmos parâmetros
✅ Estabilizado (max 10 renders em uso normal)
```

---

## 🧪 Como Testar

### 1. **Monitorar Console de Diagnóstico**
- Abrir DevTools (F12)
- Ir para a aba **Console**
- Navegar para `/estrategia`
- Observar logs `🧪[EstrategiaDBG] 🔁 render #...`

**Esperado**: 
- Render count não deve ultrapassar **10** em uso normal
- Logs `⏭️ Skipping` devem aparecer durante interações rápidas
- Sem warnings `⚠️ Taxa alta de chamadas ao Worker`

### 2. **Interagir com Filtros**
- Mudar **ESTADO/REGIÃO** múltiplas vezes
- Digitar nos campos **POLO** e **MUNICÍPIOS PRÓXIMOS**
- Ativar/desativar **Radar Estratégico**
- Clicar em **Buscar** repetidamente

**Esperado**:
- Sem travamentos ou lentidão
- Transições suaves
- Máximo 1-2 chamadas ao Worker por ação

### 3. **Verificar Performance com React DevTools**
- Instalar extensão **React Developer Tools**
- Aba **Profiler** → Start Recording
- Interagir com filtros por 30 segundos
- Stop Recording

**Esperado**:
- Gráfico de commits **estável** (sem picos infinitos)
- Commit duration **< 50ms** na maioria dos casos
- Sem componentes renderizando > 5 vezes seguidas

---

## 🔧 Arquivos Modificados

### `src/app/estrategia/page.tsx`
- **Linhas ~850-910**: Estabilização de `callWorker` com `useRef`
- **Linhas ~1090-1130**: Estabilização de `filterByJoaoPessoaRadius` com `useRef`
- **Linhas ~1140-1200**: Verificação de redundância em `AGG_PERIFERIA_BY_CODIGO`
- **Linhas ~1370-1450**: Verificação de redundância em `FILTER_AND_SORT_POLOS`

---

## 📝 Notas Técnicas

### Por que `useRef` + `useCallback` em vez de apenas `useCallback`?

**Problema**: `useCallback` com dependências cria uma **nova função** toda vez que a dependência muda. Isso dispara re-execução de todos os `useEffect` que dependem dessa função.

**Solução**: `useRef` **mantém a mesma referência** sempre, enquanto o `useEffect` interno atualiza a **lógica** quando necessário. Assim, os `useEffect` dependentes **não re-executam**, mas a lógica continua atualizada.

### Por que Hash em vez de Comparação de Objetos?

Comparar arrays/objetos diretamente em JavaScript falha por referência:
```javascript
[1, 2] === [1, 2] // false (referências diferentes)
```

Hash via `JSON.stringify()` compara **valores**, não referências:
```javascript
JSON.stringify([1, 2]) === JSON.stringify([1, 2]) // true
```

**Importante**: Arrays são ordenados (`.sort()`) antes do hash para evitar falsos negativos:
```javascript
JSON.stringify([2, 1]) !== JSON.stringify([1, 2]) // sem sort
JSON.stringify([2, 1].sort()) === JSON.stringify([1, 2].sort()) // com sort
```

---

## ⚠️ Alertas de Segurança

### Taxa Alta de Chamadas ao Worker
Se o log `⚠️ Taxa alta de chamadas ao Worker nos últimos 3s` aparecer:
- Indica que o problema **não foi totalmente resolvido**
- Verificar se alguma dependência está causando loop
- Revisar logs `🧮` para identificar fonte das chamadas

### Memory Leaks
- Workers são **terminados no cleanup** do `useEffect`
- Pendências são **limpadas** no timeout de 15s
- Sem risco de vazamento se as correções forem mantidas

---

## 🚀 Próximos Passos (Opcional)

Se o problema persistir parcialmente:
1. **Mover mais lógica para Workers**: Cálculos de `derived` podem ir para Worker
2. **Virtualização**: Usar `react-window` para listas grandes
3. **Lazy State**: Usar `useState` com função inicializadora para evitar cálculos no render
4. **useMemo mais agressivo**: Aplicar em mais derivações de dados

---

## 📚 Referências

- [React useCallback Best Practices](https://react.dev/reference/react/useCallback)
- [Avoiding useEffect Loops](https://react.dev/learn/synchronizing-with-effects#removing-effect-dependencies)
- [Web Workers for Heavy Computations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [useRef for Stable Callbacks](https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents)

---

**Data da Correção**: 30 de outubro de 2025  
**Branch**: main  
**Commit**: [Aguardando commit com título "fix: resolve infinite render loops in estrategia page"]
