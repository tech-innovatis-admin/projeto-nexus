"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { MunicipiosGeoJSON, MunicipioRelacionamento, MunicipioFeature } from '@/app/polos/types';

// Re-exportar tipos para uso externo
export type { MunicipiosGeoJSON, MunicipioRelacionamento, MunicipioFeature };

interface PolosData {
  baseMunicipios: MunicipiosGeoJSON;
  municipiosRelacionamento: MunicipioRelacionamento[];
  municipiosSatelites: string[];
  municipiosBloqueados: string[];
  metadata: {
    totalMunicipios: number;
    totalRelacionamentos: number;
    totalSatelites?: number;
    totalBloqueados?: number;
    loadedAt: string;
  };
}

interface PolosDataContextType {
  polosData: PolosData | null;
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  refreshPolosData: () => Promise<void>;
  refreshRelacionamentos: () => Promise<{ totalSatelites: number } | void>;
}

const PolosDataContext = createContext<PolosDataContextType | undefined>(undefined);

// Cache local com TTL (30 dias) + SWR em background
const CACHE_KEY = 'polos_data_cache_v2';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function PolosDataProvider({ children }: { children: React.ReactNode }) {
  const [polosData, setPolosData] = useState<PolosData | null>(null);
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
      
      const response = await fetch('/api/polos/data');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      if (showProgress) setLoadingProgress(40);

      const data = await response.json();
      
      if (showProgress) setLoadingProgress(60);

      const applyResult = (organizedData: PolosData) => {
        try {
          console.log(
            '[PolosData] baseMunicipios features:', 
            organizedData.baseMunicipios?.features?.length ?? 0,
            '| municipiosRelacionamento records:', 
            organizedData.municipiosRelacionamento?.length ?? 0
          );
        } catch {}

        setPolosData(organizedData);
        setError(null);
        
        // Salvar no localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ 
              timestamp: Date.now(), 
              data: organizedData 
            }));
          } catch (e) {
            console.warn('Erro ao salvar cache de polos:', e);
          }
        }
      };

      if (showProgress) {
        setTimeout(() => {
          setLoadingProgress(80);
          const organizedData: PolosData = {
            baseMunicipios: data.baseMunicipios,
            municipiosRelacionamento: data.municipiosRelacionamento,
            municipiosSatelites: Array.isArray(data.municipiosSatelites) ? data.municipiosSatelites : [],
            municipiosBloqueados: Array.isArray(data.municipiosBloqueados) ? data.municipiosBloqueados : [],
            metadata: data.metadata
          };
          setLoadingProgress(100);
          applyResult(organizedData);
          setTimeout(() => setLoading(false), 300);
        }, 500);
      } else {
        const organizedData: PolosData = {
          baseMunicipios: data.baseMunicipios,
          municipiosRelacionamento: data.municipiosRelacionamento,
          municipiosSatelites: Array.isArray(data.municipiosSatelites) ? data.municipiosSatelites : [],
          municipiosBloqueados: Array.isArray(data.municipiosBloqueados) ? data.municipiosBloqueados : [],
          metadata: data.metadata
        };
        applyResult(organizedData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de polos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de polos');
      setLoading(false);
    }
  };

  const loadPolosData = async () => {
    try {
      // 1) Tenta servir do cache (sem revalidação em background)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as { timestamp: number; data: PolosData };
            const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
            if (cached.data && isFresh) {
              // Cache ainda é fresco, servir e NÃO revalidar (com fallback para campos novos)
              const data = cached.data as PolosData;
              setPolosData({
                ...data,
                municipiosBloqueados: Array.isArray(data.municipiosBloqueados) ? data.municipiosBloqueados : [],
              });
              setError(null);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Erro ao ler cache de polos:', e);
        }
      }

      // 2) Sem cache válido → carregamento completo com barra de progresso
      await fetchAndStore(true);
    } catch (err) {
      console.error('Erro ao carregar dados de polos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de polos');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Executa apenas uma vez quando o provider monta
    loadPolosData();
  }, []); // Array vazio - executa UMA VEZ ao montar

  const refreshPolosData = useCallback(async () => {
    // Força uma revalidação com feedback de progresso
    await fetchAndStore(true);
  }, []);

  // Função para atualizar apenas os relacionamentos (sem buscar GeoJSON novamente)
  const refreshRelacionamentos = useCallback(async (): Promise<{ totalSatelites: number } | void> => {
    if (!polosData) {
      // Se não há dados ainda, fazer refresh completo
      await refreshPolosData();
      return;
    }

    try {
      // Buscar apenas relacionamentos usando a rota existente (todos, incluindo inativos)
      const response = await fetch('/api/relacionamentos?apenas_ativos=false');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();

      // A rota retorna { success: true, data: [...], total: N }
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error('Resposta inválida da API de relacionamentos');
      }

      const relacionamentos = json.data;

      // Buscar satélites atualizados (rota leve, sem S3)
      let municipiosSatelites: string[] = polosData.municipiosSatelites || [];
      try {
        const satRes = await fetch('/api/polos/satelites');
        const satData = await satRes.json();
        if (Array.isArray(satData.municipiosSatelites)) {
          municipiosSatelites = satData.municipiosSatelites;
        }
      } catch (satErr) {
        console.warn('[PolosData] Erro ao buscar satélites, mantendo lista anterior:', satErr);
      }

      // Atualizar relacionamentos e satélites, mantendo baseMunicipios
      const updatedData: PolosData = {
        ...polosData,
        municipiosRelacionamento: relacionamentos,
        municipiosSatelites,
        metadata: {
          ...polosData.metadata,
          totalRelacionamentos: relacionamentos.length,
          totalSatelites: municipiosSatelites.length,
          loadedAt: new Date().toISOString()
        }
      };

      setPolosData(updatedData);
      setError(null);

      // Retornar total de satélites para uso na mensagem de celebração
      const result = { totalSatelites: municipiosSatelites.length };

      // Atualizar cache também
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ 
            timestamp: Date.now(), 
            data: updatedData 
          }));
        } catch (e) {
          console.warn('Erro ao salvar cache de polos:', e);
        }
      }

      console.log('[PolosData] Relacionamentos e satélites atualizados:', relacionamentos.length, 'relacionamentos,', municipiosSatelites.length, 'satélites');
      return result;
    } catch (err) {
      console.error('Erro ao atualizar relacionamentos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar relacionamentos');
    }
  }, [polosData, refreshPolosData]);

  // Evita recriar o objeto value sem necessidade
  const contextValue = useMemo(() => ({
    polosData,
    loading,
    loadingProgress,
    error,
    refreshPolosData,
    refreshRelacionamentos
  }), [polosData, loading, loadingProgress, error, refreshPolosData, refreshRelacionamentos]);

  return (
    <PolosDataContext.Provider value={contextValue}>
      {children}
    </PolosDataContext.Provider>
  );
}

export function usePolosData() {
  const context = useContext(PolosDataContext);
  if (context === undefined) {
    throw new Error('usePolosData must be used within a PolosDataProvider');
  }
  return context;
}
