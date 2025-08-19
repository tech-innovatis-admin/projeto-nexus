"use client";

import Image from "next/image";

export default function Navbar() {

  return (
    <>
      {/* Cabeçalho */}
      <header className="w-full py-2 bg-[#1e293b] text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <div className="w-full md:max-w-[1200px] mx-auto flex items-center justify-between">
            {/* Logo e nome */}
            <div className="flex items-center gap-4">
              <div className="text-gray-400">
                <Image
                  src="/logo_innovatis.svg"
                  alt="Logo Innovatis"
                  width={40}
                  height={40}
                  className="object-contain [&>path]:fill-current [&>g]:fill-current"
                  priority
                />
              </div>
              <h1 className="text-white text-lg md:text-xl font-bold tracking-wide">Nexus - Plataforma de Produtos</h1>
            </div>
          </div>
        </div>
      </header>
      
      {/* Divisor visual */}
      <div className="mx-auto border-t border-slate-700 opacity-50 my-0.5 w-full"></div>
    </>
  );
}
