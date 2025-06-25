# NEXUS - Plataforma de Produtos e Dados Municipais

## Visão Geral

O NEXUS é uma plataforma web desenvolvida para a Innovatis MC que oferece suporte estratégico à Diretoria de Estratégia e Mercado. A plataforma disponibiliza visualização geoespacial e análise de dados municipais, com foco em informações sobre planos diretores, produtos e serviços relacionados a municípios brasileiros.

## Principais Funcionalidades

- **Visualização Geoespacial**: Mapa interativo com dados municipais de todo o Brasil
- **Busca por Município**: Filtro por estado e município para localização rápida
- **Camadas de Dados**: Visualização de diferentes conjuntos de dados (planos diretores, produtos, etc.)
- **Informações Detalhadas**: Dados específicos sobre cada município selecionado
- **Autenticação Segura**: Sistema de login para acesso controlado à plataforma

## Arquitetura do Projeto

### Frontend
- Desenvolvido com **Next.js 15** (App Router)
- Interface responsiva com **TailwindCSS**
- Componentes interativos com **React 19**
- Animações com **Framer Motion**
- Visualização de mapas com **Leaflet**
- Visualização 3D com **Three.js** e **React Three Fiber**

### Backend
- API Routes do Next.js
- Integração com **AWS S3** para armazenamento e acesso a dados GeoJSON
- Autenticação via **JWT** (JSON Web Tokens)
- Middleware para redirecionamento de rotas

### Dados
- Arquivos GeoJSON com informações municipais
- Dados armazenados no AWS S3
- Camadas de dados:
  - Base de municípios
  - Municípios sem plano diretor
  - Municípios com plano diretor vencendo
  - Produtos disponíveis
  - Parceiros

## Estrutura do Projeto

```
frontend/
├── public/            # Arquivos estáticos e dados GeoJSON
├── src/
│   ├── app/           # Páginas e API routes (Next.js App Router)
│   ├── components/    # Componentes React reutilizáveis
│   ├── contexts/      # Contextos React para gerenciamento de estado
│   ├── hooks/         # Hooks personalizados
│   ├── types/         # Definições de tipos TypeScript
│   └── utils/         # Funções utilitárias (S3, autenticação, etc.)
```

## Fluxo da Aplicação

1. O usuário acessa a página inicial com animação 3D de introdução
2. Autenticação via tela de login
3. Acesso ao mapa interativo com dados municipais
4. Busca e seleção de municípios para visualização detalhada
5. Alternância entre diferentes camadas de dados

## Tecnologias Utilizadas

- **Next.js**: Framework React para renderização do lado do servidor
- **React**: Biblioteca para construção de interfaces
- **TypeScript**: Tipagem estática para JavaScript
- **TailwindCSS**: Framework CSS utilitário
- **Leaflet**: Biblioteca para mapas interativos
- **Three.js/React Three Fiber**: Renderização 3D
- **AWS SDK**: Integração com serviços da AWS
- **JWT**: Autenticação baseada em tokens

## Requisitos de Ambiente

- Node.js 18.0.0 ou superior
- Credenciais AWS configuradas para acesso ao S3
- Variáveis de ambiente:
  - AWS_REGION
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_S3_BUCKET
  - JWT_SECRET

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Construir para produção
npm run build

# Iniciar em modo de produção
npm start
```

## Acesso

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

---

Desenvolvido pela equipe de Data Science da Innovatis MC
