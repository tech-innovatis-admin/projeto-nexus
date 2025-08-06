# NEXUS – Plataforma de Produtos e Dados Municipais

> Visualização geoespacial, análise de dados e insights estratégicos para municípios brasileiros.

## Índice
1. [Visão Geral](#visão-geral)
2. [Principais Funcionalidades](#principais-funcionalidades)
3. [Arquitetura](#arquitetura)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Tecnologias Utilizadas](#tecnologias-utilizadas)
6. [Configuração do Ambiente](#configuração-do-ambiente)
7. [Scripts NPM](#scripts-npm)
8. [Visualização em Dispositivos Móveis](#visualização-em-dispositivos-móveis)
9. [Fluxo da Aplicação](#fluxo-da-aplicação)
10. [Contribuindo](#contribuindo)
11. [Licença](#licença)

---

## Visão Geral
O **NEXUS** é uma plataforma web desenvolvida pela *Data Science Team – Innovatis MC* que oferece uma visão unificada de dados municipais, com ênfase em **planos diretores**, **produtos** e **serviços** relacionados aos municípios do Brasil. Utilizando mapas interativos, a plataforma possibilita que a Diretoria de Estratégia e Mercado tome decisões baseadas em dados atualizados e confiáveis.

---

## Principais Funcionalidades
- **Mapa Interativo** com controles de camadas (Leaflet)
- **Busca por Estado/Município** com autocomplete e normalização de acentos
- **Visualização de Camadas**:
  - Municípios (base)
  - Municípios sem plano diretor
  - Municípios com plano diretor a vencer
  - Produtos Innovatis disponíveis
  - Parceiros
- **Barra de Progresso** durante o carregamento dos arquivos GeoJSON
- **Painel de Informações** detalhadas sobre o município selecionado
- **Sistema de Autenticação**:
  - Autenticação segura via JWT (páginas protegidas)
  - Persistência de dados em PostgreSQL
  - Botão de encerrar sessão com feedback visual
  - Redirecionamento automático para tela de login
- **Interface Responsiva**:
  - Navbar com logo Innovatis e identificação da plataforma
  - Botão de encerrar sessão com design institucional
  - Indicador "Powered by Data Science Team"
- **Armazenamento de Dados**:
  - PostgreSQL para dados de usuários e autenticação
  - AWS S3 para arquivos GeoJSON e recursos estáticos
- **Animações** com Framer Motion e introdução 3D com React Three Fiber

---

## Arquitetura
```
Next.js App Router (15) ─┐
                        ├── Frontend (React 19 + TailwindCSS 4)
                        │   ├── Context API (MapDataContext)
                        │   ├── Hooks (useS3Data, useAuth)
                        │   └── Components (MapaMunicipal, LayerControl, Navbar)
                        │
                        ├── Backend (API Routes)
                        │   ├── Autenticação (JWT + PostgreSQL)
                        │   ├── Proxy para S3 (/api/proxy-geojson/*)
                        │   └── Testes & Debug (/api/debug, /api/test-s3)
                        │
                        └── Database Layer
                            ├── PostgreSQL (Usuários e Autenticação)
                            └── AWS S3 (GeoJSON / Recursos Estáticos)
```
### Fluxo de Dados
1. **Autenticação**:
   - Cliente acessa `/login`
   - Credenciais são verificadas contra banco PostgreSQL
   - Token JWT é gerado e armazenado em cookie seguro

2. **Acesso ao Mapa**:
   - Cliente autenticado acessa `/mapa`
   - `MapDataContext` solicita `/api/proxy-geojson/files`
   - API faz *stream* dos arquivos do bucket S3
   - Estado global atualiza `mapData` e `loadingProgress`
   - Interface reage à conclusão do carregamento

3. **Encerramento de Sessão**:
   - Usuário clica em "Encerrar sessão"
   - API remove cookie de autenticação
   - Cliente é redirecionado para `/login`

---

## Estrutura de Pastas
```text
src/
├── app/              # Páginas & rotas da API (App Router)
│   ├── api/          # API Routes (auth, proxy-geojson, debug, …)
│   ├── mapa/         # Página principal do mapa
│   ├── login/        # Tela de autenticação
│   └── globals.css   # Estilos globais
│
├── components/       # Componentes reutilizáveis (MapaMunicipal, LayerControl, …)
├── contexts/         # Contextos React (MapDataContext)
├── hooks/            # Hooks customizados (useS3Data, …)
├── utils/            # Serviços utilitários (s3Service, authService, envManager)
└── types/            # Tipagens adicionais (leaflet.d.ts)
```

---

## Tecnologias Utilizadas
- **Next.js 15** (App Router & API Routes)
- **React 19**
- **TypeScript 5**
- **PostgreSQL**  
  Banco de dados relacional para autenticação
- **Prisma ORM**  
  ORM para interação com PostgreSQL
- **TailwindCSS 4**  
  Estilização utilitária responsiva
- **Leaflet 1.9** & **leaflet-draw**  
  Mapa 2D interativo
- **Three.js 0.176** & **React Three Fiber**  
  Animações/introduções 3D
- **Framer Motion 12**  
  Transições e gestos
- **AWS SDK v3** (`@aws-sdk/client-s3`)  
  Integração com S3 (download e stream de dados)
- **JWT** (`jsonwebtoken`)  
  Autenticação de usuários
- **Zustand** (gerenciamento leve de estado *ad hoc*)

---

## Configuração do Ambiente
1. **Pré-requisitos**
   - Node.js 18+
   - Conta AWS com permissões de leitura no bucket

2. **Variáveis de Ambiente** (`.env.local`)
   | Chave | Descrição |
   |-------|-----------|
   | `DATABASE_URL` | URL de conexão PostgreSQL |
   | `AWS_REGION` | Região do bucket |
   | `AWS_ACCESS_KEY_ID` | Chave de acesso |
   | `AWS_SECRET_ACCESS_KEY` | Chave secreta |
   | `AWS_S3_BUCKET` | Nome do bucket |
   | `JWT_SECRET` | Segredo para assinar tokens |

> O **`envManager.ts`** pode carregar automaticamente o arquivo `senhas_s3.json` do S3 para popular o `process.env`.

---

## Scripts NPM
| Comando | Descrição |
|---------|-----------|
| `npm install` | Instala dependências |
| `npm run dev` | Ambiente de desenvolvimento (Turbopack) |
| `npm run dev -- --host 0.0.0.0` | Expor na rede local para testes mobile |
| `npm run build` | Build de produção |
| `npm start` | Inicia o servidor Next.js de produção |
| `npm run lint` | Analisa o código com ESLint |

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
1. Animação 3D de introdução (opcional) → `/`
2. Tela de **Login** → `/login`
   - Autenticação via PostgreSQL
   - Geração de token JWT
   - Redirecionamento após sucesso
3. Página **Mapa** → `/mapa`
   - Navbar com botão de encerrar sessão
   - Seleção de estado & município
   - Carregamento progressivo (barra de progresso)
   - Exibição do mapa e painel de informações
4. **Encerramento de Sessão**
   - Botão com feedback visual
   - Remoção do token JWT
   - Redirecionamento para login
5. Ações futuras: edição de camadas, exportação de relatórios…

---

## Contribuindo
1. Faça um *fork* e crie sua *branch*: `git checkout -b minha-feature`
2. **ESLint** & **TypeScript** devem passar sem erros
3. Envie o *pull request* descrevendo sua mudança

---

## Licença
Distribuído sob a **Licença MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

---

Desenvolvido pela equipe de Data Science da Innovatis MC
