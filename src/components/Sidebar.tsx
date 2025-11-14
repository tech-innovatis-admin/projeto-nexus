"use client";

import React, { useState, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  // Estado para controlar se já houve hidratação
  const [isHydrated, setIsHydrated] = useState(false);

  // Estado do sidebar - inicializa com base no localStorage no cliente
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen');
      return saved === 'true';
    }
    return false; // Valor padrão para SSR
  });

  // Hooks de contexto/roteamento DEVEM ser chamados incondicionalmente (antes de qualquer return)
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useUser();

  // Efeito para marcar que a hidratação ocorreu
  useLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  // Só renderiza o conteúdo após a hidratação para evitar mismatches
  if (!isHydrated) {
    return (
      <nav className="flex flex-col bg-slate-800 h-auto rounded-r-[18px] relative transition-all duration-500 z-10 min-w-[82px]">
        <div className="p-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">US</span>
            </div>
            <div className="flex flex-col transition-all duration-600 w-0 h-0 overflow-hidden whitespace-nowrap">
              <span className="text-white text-base font-semibold">Carregando...</span>
              <span className="text-gray-400 text-sm">Carregando...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }
  
  const isViewer = (user?.role || '').toLowerCase() === 'viewer';

  // Itens base do menu
  const baseMenuItems = [
    { id: 'home', label: 'Dashboard', icon: 'fa-solid fa-chart-line', path: '/mapa' },
    { id: 'estrategia', label: 'Estratégia', icon: 'fa-solid fa-chess', path: '/estrategia' },
    { id: 'rotas', label: 'Roteamento', icon: 'fa-solid fa-route', path: '/rotas' },
    { id: 'logout', label: 'Logout', icon: 'fa-solid fa-right-from-bracket', path: '#' }
  ];

  // Para usuários viewer, ocultar completamente as páginas /estrategia e /rotas
  const menuItems = isViewer
    ? baseMenuItems.filter(item => item.id === 'home' || item.id === 'logout')
    : baseMenuItems;

  const handleNavigation = (path: string, itemId: string) => {
    if (itemId === 'logout') {
      handleLogout();
      return;
    }
    // Apenas navega para a rota, sem alterar o estado do sidebar
    router.push(path);
  };

  const toggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    // Salvar o estado no localStorage para persistir entre navegações
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(newState));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      setUser(null); // Limpa os dados do usuário do contexto
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_token=; path=/; max-age=0";
      await new Promise(r => setTimeout(r, 100));
      window.location.replace('/login');
    } catch (e) {
      setUser(null); // Limpa os dados do usuário do contexto mesmo em caso de erro
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Adicionando Font Awesome via CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      />
      
      <nav 
        className={`
          flex flex-col bg-slate-800 h-auto rounded-r-[18px] relative transition-all duration-500 z-10
          ${isOpen ? 'min-w-[250px]' : 'min-w-[82px]'}
          ${className}
        `}
      >
        {/* Conteúdo principal do sidebar */}
        <div className="p-3">
          {/* Seção do usuário */}
          <div className="flex items-center gap-3 mb-6">
            {user?.photo ? (
              <img 
                src={user.photo.startsWith('data:image') ? user.photo : `data:image/jpeg;base64,${user.photo}`}
                alt="Foto de perfil"
                className="w-16 h-16 rounded-[24px] object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {/* Fallback para quando a imagem não carregar ou não existir */}
            <div className={`${user?.photo ? 'hidden' : 'flex'} w-16 h-16 rounded-[24px] bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center`}>
              <span className="text-white text-lg font-bold">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
              </span>
            </div>
            
            <div 
              className={`
                flex flex-col transition-all duration-600
                ${isOpen ? 'w-[150px] h-auto' : 'w-0 h-0'}
                overflow-hidden whitespace-nowrap
              `}
            >
              <span className="text-white text-base font-semibold">
                {user?.name || 'Usuário'}
              </span>
              <span className="text-gray-400 text-sm">
                {user?.cargo || 'Colaborador'}
              </span>
            </div>
          </div>

          {/* Menu de navegação */}
          <ul className="flex flex-col gap-2 list-none">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const isLogoutItem = item.id === 'logout';

              return (
                <React.Fragment key={item.id}>
                  {/* Linha divisória antes do Logout */}
                  {isLogoutItem && <div className="border-t border-slate-700 my-2"></div>}
                  <li
                    className={`
                      rounded-lg p-[14px] cursor-pointer transition-colors duration-200
                      ${isActive
                        ? 'bg-sky-600'
                        : isLogoutItem
                          ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                          : 'hover:bg-slate-700'}
                    `}
                    onClick={() => handleNavigation(item.path, item.id)}
                  >
                  <a 
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className={`
                      no-underline flex items-center transition-all duration-300
                      ${isOpen ? 'justify-start gap-[14px]' : 'justify-center'}
                      ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}
                    `}
                  >
                    {item.id === 'logout' ? (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="flex items-center justify-center w-5 h-5"
                      >
                        <path d="m16 17 5-5-5-5" />
                        <path d="M21 12H9" />
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      </svg>
                    ) : (
                      <i 
                        className={`
                          ${item.icon} flex items-center justify-center w-5 h-5 text-current
                        `}
                      />
                    )}
                    <span
                      className={`
                        text-sm transition-all duration-600
                        ${isOpen ? 'w-[150px] h-auto' : 'w-0 h-0'}
                        overflow-hidden whitespace-nowrap
                      `}
                    >
                      {item.label}
                    </span>
                  </a>
                </li>
                </React.Fragment>
              );
            })}
          </ul>

          {/* Botão de abrir/fechar */}
          <button
            onClick={toggleSidebar}
            className="
              absolute top-[30px] -right-[10px] bg-sky-600 text-white 
              rounded-full w-5 h-5 border-none cursor-pointer 
              flex items-center justify-center hover:bg-sky-700 transition-colors
            "
          >
            <i 
              className={`
                fa-solid fa-chevron-right text-xs transition-transform duration-300 ease-in-out
                ${isOpen ? 'rotate-180' : 'rotate-0'}
              `}
            />
          </button>
        </div>
      </nav>
    </>
  );
}
