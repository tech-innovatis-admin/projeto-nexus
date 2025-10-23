# Feature: Modo Vendas - Análise de Oportunidades

## 📋 Visão Geral

Feature implementada para permitir análise rápida de oportunidades de venda de produtos municipais (Plano Diretor e PMSB) diretamente no mapa interativo do sistema NEXUS.

## 🎯 Objetivo

Fornecer aos usuários uma visualização clara e objetiva de quais produtos podem ser vendidos para um município específico, baseado em regras de vigência e status atuais.

## ✨ Funcionalidades

### 1. **Botão Toggle "O que vender?"**
- Localização: Barra de ações da página `/mapa`, ao lado dos botões "Buscar" e "Limpar"
- Estados:
  - **OFF (padrão)**: Exibe portfólio completo de produtos
  - **ON (modo vendas)**: Exibe análise de oportunidades
- Comportamento:
  - Desabilitado quando nenhum município está selecionado
  - Visual diferenciado (verde) quando ativado
  - Tooltip explicativo ao passar o mouse

### 2. **Visualização em Modo Vendas**
Quando ativado, o card de "Produtos Municipais" **filtra a lista existente**, removendo apenas PD e PMSB que não podemos vender:

#### **Produtos Filtrados (PD e PMSB)**
- **Plano Diretor**: Aparece apenas se não possui OU está vencido (>10 anos)
- **PMSB**: Aparece apenas se não possui OU está vencido (>4 anos)

#### **Produtos Sempre Visíveis**
- **REURB**: Sempre aparece (sem regras específicas)
- **PLHIS**: Sempre aparece (sem regras específicas)
- **CTM (IPTU Legal)**: Sempre aparece (sem regras específicas)
- **Start Lab**: Sempre aparece (sem regras específicas)
- **Plano Decenal Meio Ambiente**: Sempre aparece (sem regras específicas)
- **Plano de Desertificação**: Sempre aparece (sem regras específicas)
- **Educa Game**: Sempre aparece (sem regras específicas)
- **Procon Vai às Aulas**: Sempre aparece (sem regras específicas)
- **Programa Saber+**: Sempre aparece (sem regras específicas)

## 📐 Regras de Negócio

### Vigências
| Produto | Vigência | Cálculo de Vencimento |
|---------|----------|----------------------|
| **Plano Diretor (PD)** | 10 anos | `PD_ANO + 10 < ano_atual` |
| **PMSB** | 4 anos | `PMSB_ANO + 4 < ano_atual` |

### Critérios de Elegibilidade

#### Plano Diretor (PD)
**Podemos vender quando:**
- Município não possui PD (`PD_ALTERADA !== "sim"`)
- PD está vencido (ano + 10 < ano atual)

**Não vender quando:**
- PD existe e está dentro da vigência

#### PMSB
**Podemos vender quando:**
- Município não possui PMSB (`plano_saneamento_existe !== "sim" && !== "em elaboracao"`)
- PMSB está vencido (ano + 4 < ano atual)

**Não vender quando:**
- PMSB existe e está dentro da vigência
- PMSB está "em elaboração" (considerado válido)

### Validação de Anos
- Anos válidos: > 1900 e <= ano_atual + 10
- Valores inválidos tratados: `"-"`, `"NA"`, `"Recusa"`, strings não numéricas

## 🏗️ Arquitetura

### Arquivos Principais

#### 1. **`src/utils/produtos.ts`**
Funções puras e testáveis para lógica de negócio:

```typescript
// Funções principais
normalizarTexto(texto: string): string
isAnoValido(ano: string | number): boolean
temPlanoDiretor(props: PropriedadesMunicipio): boolean
isPDVencido(props: PropriedadesMunicipio, anoAtual?: number): boolean
temPMSB(props: PropriedadesMunicipio): boolean
isPMSBVencido(props: PropriedadesMunicipio, anoAtual?: number): boolean
classificarElegibilidade(props: PropriedadesMunicipio, anoAtual?: number): ClassificacaoElegibilidade
gerarTelemetriaVendas(classificacao: ClassificacaoElegibilidade, municipio?: MunicipioDados): TelemetriaVendas
```

**Constantes:**
```typescript
export const PD_VIGENCIA_ANOS = 10;
export const PMSB_VIGENCIA_ANOS = 4;
```

#### 2. **`src/app/mapa/page.tsx`**
Gerencia o estado do modo vendas:

```typescript
const [modoVendas, setModoVendas] = useState<boolean>(false);

// Passado como prop para o componente filho
<InformacoesMunicipio 
  municipioSelecionado={municipioSelecionado} 
  modoVendas={modoVendas}
/>
```

#### 3. **`src/components/InformacoesMunicipio.tsx`**
Renderização condicional baseada na prop `modoVendas`:

```typescript
interface InformacoesMunicipioProps {
  municipioSelecionado: Feature | null;
  modoVendas?: boolean; // Nova prop
}
```

### Tipos TypeScript

```typescript
interface PropriedadesMunicipio {
  PD_ALTERADA?: string | null;
  PD_ANO?: string | number | null;
  plano_saneamento_existe?: string | null;
  plano_saneamento_ano?: string | number | null;
  VALOR_PD?: string | number | null;
  VALOR_PMSB?: string | number | null;
  [key: string]: any;
}

interface ItemProduto {
  chave: string;
  nome: string;
  valor: string | number | null;
  ano?: number | null;
  status: 'vencido' | 'em_dia' | 'nao_tem';
  motivo?: string;
}

interface ClassificacaoElegibilidade {
  vender: ItemProduto[];
  naoVender: ItemProduto[];
}
```

## 📊 Telemetria

### Eventos Registrados

#### 1. **Toggle do Modo Vendas**
```javascript
console.log(`💼 [MapaPage] ${userInfo} - Modo vendas ${estado}`, {
  estado: 'on' | 'off',
  municipio: code_muni,
  uf: UF,
  nome_municipio: string
});
```

#### 2. **Renderização em Modo Vendas**
```javascript
console.log('💼 [InformacoesMunicipio] Modo vendas renderizado:', {
  vender: number,
  naoVender: number,
  produtos_vender: string[],
  produtos_nao_vender: string[],
  code_muni: string,
  uf: string
});
```

## 🧪 Testes

### Arquivo de Testes
`src/utils/produtos.test.ts` - Suite completa de testes unitários

### Casos Cobertos

#### Normalização
- ✅ Remoção de acentos
- ✅ Conversão para minúsculas
- ✅ Tratamento de valores nulos/indefinidos
- ✅ Remoção de caracteres especiais

#### Validação de Anos
- ✅ Anos válidos (numéricos, > 1900)
- ✅ Anos inválidos (strings, nulos, < 1900)
- ✅ Anos futuros (limite de +10 anos)

#### Plano Diretor
- ✅ Detecção de existência
- ✅ Cálculo de vencimento (10 anos)
- ✅ Casos limite (exato 10 anos)
- ✅ Classificação de elegibilidade

#### PMSB
- ✅ Detecção de existência
- ✅ Status "em elaboração"
- ✅ Cálculo de vencimento (4 anos)
- ✅ Casos limite (exato 4 anos)
- ✅ Valores inválidos (-, NA, Recusa)

#### Classificação
- ✅ Cenário: Não tem PD nem PMSB
- ✅ Cenário: Ambos válidos
- ✅ Cenário: Ambos vencidos
- ✅ Cenário: Mistos (um válido, outro vencido)
- ✅ Telemetria completa

### Executar Testes
```bash
# Instalar dependências de teste (se necessário)
npm install --save-dev @types/jest

# Executar testes
npm test -- produtos.test.ts

# Executar com cobertura
npm test -- --coverage produtos.test.ts
```

## 🎨 Design e UX

### Cores e Estados

| Elemento | Estado OFF | Estado ON |
|----------|-----------|-----------|
| **Botão Toggle** | Border slate-600, texto slate-300 | Border green-500, texto green-400, bg green-900/30 |
| **Seção "Podemos Vender"** | - | Background gradient green-900, border green-700 |
| **Seção "Não Vender"** | - | Background slate-800/30, border slate-700 |

### Badges de Status

| Status | Cor | Contexto |
|--------|-----|----------|
| **Não possui** | Vermelho (red-300) | Município não tem o produto |
| **Vencido** | Amarelo (yellow-300) | Produto existe mas está vencido |
| **Em dia** | Verde (green-300) | Produto válido (não vender) |

### Responsividade
- Mobile: Botão ocupa largura completa (`w-full md:w-auto`)
- Desktop: Layout em grid com scroll independente
- Tooltip posicionado dinamicamente (evita sair da tela)

## 🔒 Segurança e Performance

### Performance
- ✅ Funções memoizadas com `useMemo` onde apropriado
- ✅ Classificação calculada apenas quando `modoVendas = true`
- ✅ Telemetria com `useEffect` com dependências otimizadas
- ✅ Zero chamadas de rede adicionais

### Segurança
- ✅ Validação de dados de entrada
- ✅ Tratamento de valores nulos/undefined
- ✅ Sanitização de strings (normalização)
- ✅ Sem exposição de dados sensíveis nos logs

## 📝 Uso

### Fluxo do Usuário

1. **Selecionar município** no dropdown ou mapa
2. **Visualizar portfólio completo** (modo padrão)
3. **Clicar no botão "O que vender?"** para ativar modo vendas
4. **Analisar oportunidades** nas seções "Podemos Vender" e "Não Vender"
5. **Clicar novamente** para voltar ao portfólio completo

### Exemplo de Código

```tsx
// Em qualquer componente que precise usar a classificação
import { classificarElegibilidade } from '@/utils/produtos';

const municipio = {
  PD_ALTERADA: 'sim',
  PD_ANO: 2010, // Vencido
  plano_saneamento_existe: 'sim',
  plano_saneamento_ano: 2023, // Válido
  VALOR_PD: 'R$ 150.000',
  VALOR_PMSB: 'R$ 200.000'
};

const classificacao = classificarElegibilidade(municipio);

console.log(classificacao);
// {
//   vender: [{ chave: 'VALOR_PD', nome: 'Plano Diretor - 2010', status: 'vencido', ... }],
//   naoVender: [{ chave: 'VALOR_PMSB', nome: 'PMSB - 2023', status: 'em_dia', ... }]
// }
```

## 🚀 Evolução Futura

### Configuração via Ambiente
```bash
# .env.local (futuro)
NEXT_PUBLIC_PD_VIGENCIA_ANOS=10
NEXT_PUBLIC_PMSB_VIGENCIA_ANOS=4
```

### Persistência de Estado
- Considerar salvar preferência do usuário (ON/OFF) no `sessionStorage`
- Restaurar estado ao navegar entre municípios

### Expansão
- Incluir outros produtos além de PD e PMSB
- Adicionar filtros por categoria
- Exportar relatório de oportunidades (PDF)

## 📄 Documentação Relacionada

- [`VISAO_GERAL_TECNICA.md`](../../VISAO_GERAL_TECNICA.md) - Arquitetura geral do projeto
- [`README.md`](../../README.md) - Documentação principal do NEXUS
- [Miro - Fluxo de Vendas](link-futuro) - Diagrama visual do fluxo

## 🤝 Contribuindo

Ao modificar esta feature:

1. **Atualizar testes** em `produtos.test.ts`
2. **Validar regras de negócio** com stakeholders
3. **Testar responsividade** em múltiplos dispositivos
4. **Verificar telemetria** no console
5. **Documentar mudanças** neste README

## 📞 Contato

Dúvidas ou sugestões sobre esta feature:
- **Time de Frontend**: frontend@innovatis.com.br
- **Product Owner**: Victor
- **Data Science Team**: Responsável pela lógica de negócio

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0.0  
**Status:** ✅ Produção
