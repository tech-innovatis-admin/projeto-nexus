"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string | null;
  email: string | null;
  role: string | null;
  name: string | null;
  cargo: string | null;
  photo: string | null;
  isRestricted?: boolean; // Viewer restrito (possui registros em municipio_acessos)
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Não precisamos ler cookie httpOnly no client.
      // A API de verificação lerá o cookie servidor-side.
      const response = await fetch('/api/auth/verify', { credentials: 'include' });

      const data = await response.json();

      if (data.success && data.user) {
        let enrichedUser: User = data.user;
        // Descobrir se o usuário é Viewer restrito (possui registros na tabela municipio_acessos)
        if (String(enrichedUser.role || '').toLowerCase() === 'viewer') {
          try {
            const acessosResp = await fetch('/api/municipios/acessos', { credentials: 'include' });
            if (acessosResp.ok) {
              const acessosData = await acessosResp.json();
              const totalAcessos = typeof acessosData?.totalAcessos === 'number' ? acessosData.totalAcessos : 0;
              enrichedUser = { ...enrichedUser, isRestricted: totalAcessos > 0 };
            } else {
              enrichedUser = { ...enrichedUser, isRestricted: false };
            }
          } catch {
            enrichedUser = { ...enrichedUser, isRestricted: false };
          }
        }
        setUser(enrichedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
