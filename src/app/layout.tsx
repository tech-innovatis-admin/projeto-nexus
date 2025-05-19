/**
 * Layout raiz da aplicação NEXUS
 * Define a estrutura base comum a todas as páginas, incluindo:
 * - Configurações de fontes
 * - Metadados da aplicação
 * - Estrutura HTML base
 */

// Tipo para metadados do Next.js
import type { Metadata } from "next";
// Importação das fontes Geist (sans-serif e monospace)
import { Geist, Geist_Mono } from "next/font/google";
// Estilos globais da aplicação
import "./globals.css";
// Componente 3D da NEXUS (não utilizado diretamente no layout)
import Nexus3D from "../components/Nexus3D";

// Configuração da fonte Geist Sans
const geistSans = Geist({
  variable: "--font-geist-sans", // Variável CSS para uso em toda aplicação
  subsets: ["latin"], // Carrega apenas caracteres latinos para otimização
});

// Configuração da fonte Geist Mono
const geistMono = Geist_Mono({
  variable: "--font-geist-mono", // Variável CSS para uso em toda aplicação
  subsets: ["latin"], // Carrega apenas caracteres latinos para otimização
});

// Metadados da aplicação (SEO e configurações da página)
export const metadata: Metadata = {
  title: 'NEXUS - Plataforma de Produtos', // Título da página
  description: 'NEXUS é uma plataforma de produtos e dados municipais que oferece suporte estratégico à Diretoria de Estratégia e Mercado da Innovatis MC.',
  viewport: 'width=device-width, initial-scale=1', // Configuração de responsividade
  icons: {
    icon: '/logo_innovatis.svg', // Usando o novo ícone SVG
  },
};

// Colocar de forma dinâmica o ícone da logo na guia
// icon: [ // Alterado para um array para suportar múltiplos ícones baseados em media query
//   { url: '/logo_innovatis_preta.svg', media: '(prefers-color-scheme: light)' },
//   { url: '/logo_innovatis.svg', media: '(prefers-color-scheme: dark)' },
// ],

// Componente de layout raiz que envolve todas as páginas
export default function RootLayout({
  children, // Conteúdo das páginas que serão renderizadas dentro do layout
}: {
  children: React.ReactNode
}) {
  return (
    // Define o idioma do documento como português do Brasil
    <html lang="pt-BR">
      <head>
        {/* Otimização de carregamento de fontes */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonte Montserrat para elementos específicos */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      {/* 
        Aplica as variáveis das fontes Geist e antialiasing
        para melhor renderização de texto
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
