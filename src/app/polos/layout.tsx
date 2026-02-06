/**
 * Layout da página de Polos
 * Fornece o contexto PolosDataProvider apenas para esta seção
 */

import { PolosDataProvider } from "@/contexts/PolosDataContext";

export default function PolosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PolosDataProvider>
      {children}
    </PolosDataProvider>
  );
}
