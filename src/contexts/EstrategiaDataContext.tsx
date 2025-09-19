"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface EstrategiaData {
  poloValores: any;
  poloPeriferia: any;
}

interface EstrategiaDataContextType {
  estrategiaData: EstrategiaData | null;
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  refreshEstrategiaData: () => Promise<void>;
}

const EstrategiaDataContext = createContext<EstrategiaDataContextType | undefined>(undefined);

// Cache local com TTL (30 dias) + SWR em background
const CACHE_KEY = 'estrategia_data_cache_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function EstrategiaDataProvider({ children }: { children: React.ReactNode }) {
  const [estrategiaData, setEstrategiaData] = useState<EstrategiaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Função que busca da API, organiza e grava no estado + cache
  const fetchAndStore = async (showProgress: boolean) => {
    if (showProgress) {
      setLoading(true);
      setLoadingProgress(10);
    }
    try {
      if (showProgress) setLoadingProgress(20);
      // Não usar { cache: 'no-store' } aqui para permitir cache HTTP quando aplicável
      const response = await fetch('/api/estrategia/data');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      if (showProgress) setLoadingProgress(40);

      const data = await response.json();
      if (showProgress) setLoadingProgress(60);

      const applyResult = (organizedData: EstrategiaData) => {
        try {
          console.log('[EstrategiaData] poloValores features:', organizedData.poloValores?.features?.length ?? 0,
            '| poloPeriferia features:', organizedData.poloPeriferia?.features?.length ?? 0);
        } catch {}

        setEstrategiaData(organizedData);
        setError(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: organizedData }));
          } catch {}
        }
      };

      // Opcional: pequena simulação para barra de progresso quando visível
      if (showProgress) {
        setTimeout(() => {
          setLoadingProgress(80);
          const organizedData: EstrategiaData = {
            poloValores: data.poloValores,
            poloPeriferia: data.poloPeriferia,
          };
          setLoadingProgress(100);
          applyResult(organizedData);
          setTimeout(() => setLoading(false), 300);
        }, 500);
      } else {
        const organizedData: EstrategiaData = {
          poloValores: data.poloValores,
          poloPeriferia: data.poloPeriferia,
        };
        applyResult(organizedData);
        // Não tocar no loading quando SWR em background
      }
    } catch (err) {
      console.error('Erro ao carregar dados estratégicos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados estratégicos');
      setLoading(false);
    }
  };

  const loadEstrategiaData = async () => {
    try {
      // 1) Tenta servir do cache (stale-while-revalidate)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as { timestamp: number; data: EstrategiaData };
            const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
            if (cached.data) {
              setEstrategiaData(cached.data);
              setError(null);
              setLoading(false);
              // 2) Revalida em background se o cache estiver fresco ou velho
              void fetchAndStore(false);
              return;
            }
          }
        } catch {}
      }

      // 3) Sem cache válido → carregamento completo com barra de progresso
      await fetchAndStore(true);
    } catch (err) {
      console.error('Erro ao carregar dados estratégicos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados estratégicos');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Evita recarregar se os dados já estiverem presentes (em navegações entre páginas)
    if (estrategiaData) return;
    loadEstrategiaData();
  }, [estrategiaData]);

  const refreshEstrategiaData = async () => {
    // Força uma revalidação com feedback de progresso
    await fetchAndStore(true);
  };

  return (
    <EstrategiaDataContext.Provider value={{
      estrategiaData,
      loading,
      loadingProgress,
      error,
      refreshEstrategiaData
    }}>
      {children}
    </EstrategiaDataContext.Provider>
  );
}

export function useEstrategiaData() {
  const context = useContext(EstrategiaDataContext);
  if (context === undefined) {
    throw new Error('useEstrategiaData must be used within a EstrategiaDataProvider');
  }
  return context;
}
