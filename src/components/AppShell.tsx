"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileMenu from "@/components/MobileMenu";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // NÃO deve aparecer o menu
  const hideLayout = pathname === "/login";

  if (hideLayout) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar onMenuClick={() => setIsOpen(prev => !prev)} />

      <MobileMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      <main>{children}</main>
    </>
  );
}