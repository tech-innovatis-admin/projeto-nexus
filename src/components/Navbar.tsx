"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Chama a API de logout primeiro
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Remover o cookie de autenticação do lado do cliente também
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_token=; path=/; max-age=0";
      
      // Aguardar um pouco para garantir que as operações foram concluídas
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forçar refresh da página para a rota de login
      window.location.replace("/login");
    } catch (error) {
      console.error("Erro no logout:", error);
      // Fallback: Remove cookie manualmente e redireciona
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Cabeçalho */}
      <header className="w-full py-2 bg-[#1e293b] text-white shadow-md">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <div className="w-full md:max-w-[1200px] mx-auto flex items-center justify-between">
            {/* Logo e nome à esquerda */}
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
            
            {/* Botão de Encerrar Sessão */}
            <div>
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1.5 px-4 rounded-md text-sm transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out-icon lucide-log-out">
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Divisor visual */}
      <div className="mx-auto border-t border-slate-700 opacity-50 my-0.5 w-full"></div>
    </>
  );
}
