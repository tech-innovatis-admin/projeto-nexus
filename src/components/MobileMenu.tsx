"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useUser();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null;
  }

  const isViewer = (user?.role || '').toLowerCase() === 'viewer';

  const baseMenuItems = [
    { id: 'home', label: 'Dashboard', icon: 'fa-solid fa-chart-line', path: '/mapa' },
    { id: 'polos', label: 'Polos', icon: 'fa-solid fa-map-pin', path: '/polos' },
    { id: 'rotas', label: 'Roteamento', icon: 'fa-solid fa-route', path: '/rotas' },
    { id: 'logout', label: 'Logout', icon: 'fa-solid fa-right-from-bracket', path: '#' }
  ];

  const menuItems = isViewer
    ? baseMenuItems.filter(item => item.id === 'home' || item.id === 'logout')
    : baseMenuItems;

  const handleNavigation = (path: string, itemId: string) => {
    if (itemId === 'logout') {
      handleLogout();
      return;
    }
    router.push(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      setUser(null);
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "auth_token=; path=/; max-age=0";
      await new Promise(r => setTimeout(r, 100));
      window.location.replace('/login');
    } catch (e) {
      setUser(null);
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menu Mobile */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do Menu */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar menu"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Informações do Usuário */}
        {user && (
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {user.name || user.username || 'Usuário'}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {user.role || 'Acessando...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Itens do Menu */}
        <nav className="flex flex-col">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path, item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                pathname === item.path && item.id !== 'logout'
                  ? 'bg-slate-700 border-l-blue-500 text-blue-400'
                  : 'border-l-transparent text-gray-300 hover:bg-slate-700 hover:text-white'
              } ${item.id === 'logout' ? 'text-red-400 hover:bg-red-500/10' : ''}`}
            >
              <i className={`${item.icon} w-5`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900/50">
          <p className="text-xs text-gray-500 text-center">NEXUS v1.0</p>
        </div>
      </div>
    </>
  );
}