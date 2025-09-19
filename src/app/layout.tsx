/**
 * Layout raiz da aplicação NEXUS
 * Define a estrutura base comum a todas as páginas
 */

// Tipo para metadados do Next.js
import type { Metadata } from "next";
// Estilos globais da aplicação
import "./globals.css";
// Componente 3D da NEXUS
import Nexus3D from "../components/Nexus3D";
// Contexto do usuário
import { UserProvider } from "../contexts/UserContext";
import { MapDataProvider } from "../contexts/MapDataContext";
import { EstrategiaDataProvider } from "../contexts/EstrategiaDataContext";

// Metadados da aplicação (SEO e configurações da página)
export const metadata: Metadata = {
  title: 'NEXUS - Plataforma de Produtos',
  description: 'NEXUS é uma plataforma de produtos e dados municipais que oferece suporte estratégico à Diretoria de Estratégia e Mercado da Innovatis MC.',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/logo_innovatis_preta.svg',
  },
};

// Componente de layout raiz que envolve todas as páginas
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Otimização de carregamento de fontes */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <UserProvider>
          <MapDataProvider>
            <EstrategiaDataProvider>
              {children}
            </EstrategiaDataProvider>
          </MapDataProvider>
        </UserProvider>
      </body>
    </html>
  )
}
