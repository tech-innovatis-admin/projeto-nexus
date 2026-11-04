/**
 * Layout raiz da aplicação NEXUS
 * Define a estrutura base comum a todas as páginas
 */

import '@/utils/disableLogs';
// Tipos do Next.js
import type { Metadata, Viewport } from "next";
// Estilos globais da aplicação
import "./globals.css";
// Componente 3D da NEXUS
import Nexus3D from "../components/Nexus3D";
import DisableLogsClient from "@/components/DisableLogsClient";
// Contexto do usuário
import { UserProvider } from "../contexts/UserContext";
import { CartoKeyProvider } from "../contexts/CartoKeyContext";
import { MapDataProvider } from "../contexts/MapDataContext";
import { EstrategiaDataProvider } from "../contexts/EstrategiaDataContext";
import AppShell from '@/components/AppShell';

export const dynamic = "force-dynamic";

// Metadados da aplicação (SEO e configurações da página)
export const metadata: Metadata = {
  title: 'NEXUS - Plataforma de Produtos',
  description: 'NEXUS é uma plataforma de produtos e dados municipais que oferece suporte estratégico à Diretoria de Estratégia e Mercado da Innovatis.',
  icons: {
    icon: '/logo_innovatis_preta.svg',
  },
};

// Viewport deve ser exportado separadamente em Next 13.4+
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <DisableLogsClient />
        <CartoKeyProvider apiKey={process.env["API_CARTO_KEY"]?.trim() ?? ""}>
        <UserProvider>
          <MapDataProvider>
            <EstrategiaDataProvider>
              <AppShell>
                {children}
              </AppShell>
            </EstrategiaDataProvider>
          </MapDataProvider>
        </UserProvider>
        </CartoKeyProvider>
      </body>
    </html>
  )
}
