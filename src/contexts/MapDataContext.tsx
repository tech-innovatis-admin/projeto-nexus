"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Feature } from 'geojson';

interface MapData {
  dados: any;
  produtos: any;
  parceiros: any;
  pistas: any[] | null;
  sedesMunicipais: any[] | null;
}

interface MapDataContextType {
  mapData: MapData | null;
  loading: boolean;
  loadingProgress: number;
  error: string | null;
  refreshData: () => Promise<void>;
  municipioSelecionado: Feature | null;
  setMunicipioSelecionado: React.Dispatch<React.SetStateAction<Feature | null>>;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

export function MapDataProvider({ children }: { children: React.ReactNode }) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<Feature | null>(null);

  // Cache local com TTL (30 dias) + SWR em background
  const CACHE_KEY = 'mapData_cache_v1';
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

  // Função que busca da API, organiza e grava no estado + cache
  const fetchAndStore = async (showProgress: boolean) => {
    if (showProgress) {
      setLoading(true);
      setLoadingProgress(10);
    }
    try {
      if (showProgress) setLoadingProgress(20);
      // Não usar { cache: 'no-store' } aqui para permitir cache HTTP quando aplicável
      const response = await fetch('/api/proxy-geojson/files');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      if (showProgress) setLoadingProgress(40);

      const files = await response.json();
      if (showProgress) setLoadingProgress(60);

      const applyResult = (organizedData: MapData) => {
        try {
          console.log('[MapData] dados.features:', organizedData.dados?.features?.length ?? 0,
            '| parceiros:', Array.isArray(organizedData.parceiros) ? organizedData.parceiros.length : 0,
            '| pistas:', Array.isArray(organizedData.pistas) ? organizedData.pistas.length : 0,
            '| sedesMunicipais:', Array.isArray(organizedData.sedesMunicipais) ? organizedData.sedesMunicipais.length : 0);
          if (Array.isArray(organizedData.pistas) && organizedData.pistas.length > 0) {
            console.log('[MapData] exemplo de pista:', organizedData.pistas[0]);
          }
          if (Array.isArray(organizedData.sedesMunicipais) && organizedData.sedesMunicipais.length > 0) {
            console.log('[MapData] exemplo de sede municipal:', organizedData.sedesMunicipais[0]);
          }
        } catch {}

        setMapData(organizedData);
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
          const organizedData: MapData = {
            dados: files.find((f: any) => f.name === 'base_municipios.geojson')?.data || null,
            produtos: null,
            parceiros: null,
            pistas: files.find((f: any) => f.name === 'pistas_s3_lat_log.json')?.data || null,
            sedesMunicipais: files.find((f: any) => f.name === 'sedes_municipais_lat_long.json')?.data || null,
          };
          setLoadingProgress(100);
          applyResult(organizedData);
          setTimeout(() => setLoading(false), 300);
        }, 500);
      } else {
        const organizedData: MapData = {
          dados: files.find((f: any) => f.name === 'base_municipios.geojson')?.data || null,
          produtos: null,
          parceiros: null,
          pistas: files.find((f: any) => f.name === 'pistas_s3_lat_log.json')?.data || null,
          sedesMunicipais: files.find((f: any) => f.name === 'sedes_municipais_lat_long.json')?.data || null,
        };
        applyResult(organizedData);
        // Não tocar no loading quando SWR em background
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // 1) Tenta servir do cache (stale-while-revalidate)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as { timestamp: number; data: MapData };
            const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
            if (cached.data) {
              setMapData(cached.data);
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
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Evita recarregar se os dados já estiverem presentes (em navegações entre páginas)
    if (mapData) return;
    loadData();
  }, [mapData]);

  const refreshData = async () => {
    // Força uma revalidação com feedback de progresso
    await fetchAndStore(true);
  };

  return (
    <MapDataContext.Provider value={{ 
      mapData, 
      loading, 
      loadingProgress, 
      error, 
      refreshData,
      municipioSelecionado,
      setMunicipioSelecionado
    }}>
      {children}
    </MapDataContext.Provider>
  );
}

export function useMapData() {
  const context = useContext(MapDataContext);
  if (context === undefined) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }
  return context;
} 