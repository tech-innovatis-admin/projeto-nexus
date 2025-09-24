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
  - Municípios (base demográfica e política)
  - Municípios sem plano diretor
  - Municípios com plano diretor a vencer
  - Parceiros institucionais com marcadores customizados
  - Dados de pistas de voo por município
- **Controles Interativos**: Zoom, pan, camadas toggleáveis
- **Destaque Inteligente**: Animações de fade-in/fade-out
- **Popups Informativos**: Dados demográficos, políticos e produtos
- **Busca Inteligente**: Autocomplete com normalização de acentos
- **Ferramenta de Raio**: Análise de cobertura de valores por área geográfica

### 📊 **Módulo Estratégia**
- **Análise de Polos de Valores** (geojson estratégico)
- **Dados de Periferia Urbana** para planejamento
- **Visualização Temática** de conectividade municipal
- **Integração com Dados Municipais** para insights estratégicos
- **Filtro Unificado ESTADO/REGIÃO** com seleção por regiões e estados
- **Indicadores Visuais de Abertura** comercial por estado/região
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
**Arquivos Principais:**
- `base_municipios.geojson` - Dados municipais completos
- `base_pd_sem_plano.geojson` - Municípios sem plano diretor
- `base_pd_vencendo.geojson` - Planos diretores a vencer
- `parceiros1.json` - Instituições parceiras
- `pistas_s3.csv` - Dados de pistas de voo
- `base_polo_valores.geojson` - Análise estratégica
- `base_polo_periferia.geojson` - Dados de periferia
- `senhas_s3.json` - Configurações seguras

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
│   │   └── debug/         # Utilitários de debug
│   ├── mapa/              # Página principal do mapa
│   ├── estrategia/        # Módulo estratégico
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
│   └── LayerControl.tsx   # Controles de camadas
│
├── contexts/              # Contextos React para estado global
│   ├── MapDataContext.tsx     # Dados do mapa e cache
│   ├── UserContext.tsx        # Estado do usuário autenticado
│   └── EstrategiaDataContext.tsx # Dados estratégicos e cache
│
├── utils/                 # Utilitários e serviços
│   ├── s3Service.ts       # Cliente S3 e cache
│   ├── pdfOrcamento.ts    # Geração de PDFs
│   ├── cacheGeojson.ts    # Cache inteligente
│   ├── authService.ts     # Utilitários de auth
│   └── passwordUtils.ts   # Utilitários de senha
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
- **Next.js 15** (App Router & API Routes)
- **React 19** com TypeScript 5
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
- **React Icons** - Biblioteca de ícones
- **FontAwesome 6** - Ícones vetoriais

### ☁️ **Backend e Banco de Dados**
- **Prisma ORM** - Cliente PostgreSQL com type safety
- **PostgreSQL** - Banco de dados relacional
- **AWS SDK v3** (`@aws-sdk/client-s3`) - Integração S3
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

# Ambiente (desenvolvimento/produção)
NODE_ENV=development
```

### 📁 **Arquivos S3 Necessários**
O bucket deve conter estes arquivos na raiz:
- `base_municipios.geojson`
- `base_pd_sem_plano.geojson`
- `base_pd_vencendo.geojson`
- `parceiros1.json`
- `pistas_s3.csv`
- `base_polo_valores.geojson`
- `base_polo_periferia.geojson`
- `senhas_s3.json` (opcional - configurações adicionais)

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

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

### 🔍 **Verificação da Instalação**
- Acesse `http://localhost:3000`
- Faça login com credenciais válidas
- Verifique se o mapa carrega corretamente
- Teste a busca por municípios
- Confirme exportação de PDFs funcionando

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

#### **7. Módulo Estratégia** (`/estrategia`)
- **Dados de polos de valores** e periferia
- **Visualização temática** para análise estratégica
- **Integração com dados municipais**
- **Filtro unificado ESTADO/REGIÃO** com seleção avançada
- **Indicadores visuais de abertura comercial**
- **Ferramenta de raio com exportação XLSX aprimorada**
- **Popups corrigidos** com códigos IBGE completos

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

### 🔧 **Correções Técnicas Recentes (2025)**
- **Códigos IBGE Corretos**: Popups das periferias agora exibem códigos IBGE corretos
  - Adicionado `codigo_destino` nas properties do FeatureCollection de periferias
  - Fallback inteligente: `codigo_destino` → `codigo` → `codigo_ibge` → vazio
- **Exportação XLSX Aprimorada**: Coluna "Código IBGE" padronizada
  - Polos: usam `codigo_origem`
  - Periferias: usam `codigo_destino` (com fallback para `codigo_origem`)
- **Filtro Unificado**: Substituição do filtro separado "UF's Abertura"
  - Componente `EstadoDropdown` com Portal React
  - Seleção múltipla por regiões e estados
  - Indicadores visuais de abertura comercial em azul

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
- 📧 **Email**: suporte@nexus.innovatis.com.br
- 📱 **Issues**: GitHub Issues para bugs e solicitações
- 📚 **Documentação**: Este README e comentários no código

---

**Desenvolvido pela equipe de Data Science da Innovatis MC** 🚀
