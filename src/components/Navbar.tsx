"use client";

import Image from "next/image";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <>
      {/* Cabeçalho */}
      <header className="w-full py-2 bg-[#1e293b] text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <div className="w-full md:max-w-[1200px] mx-auto flex items-center justify-between">

            {/* ESQUERDA: botão mobile + logo */}
            <div className="flex items-center gap-3 md:gap-4">

              {/* BOTÃO MOBILE */}
              <button
                onClick={onMenuClick}
                className="md:hidden text-white p-2 rounded hover:bg-slate-700 transition"
                aria-label="Abrir menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Logo */}
              <div className="text-gray-400">
                <Image
                  src="/logo_innovatis.svg"
                  alt="Logo Innovatis"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Título */}
              <h1 className="text-white text-sm sm:text-base md:text-xl font-bold tracking-wide truncate">
                Nexus - Plataforma de Produtos
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Divisor */}
      <div className="mx-auto border-t border-slate-700 opacity-50 my-0.5 w-full"></div>
    </>
  );
}