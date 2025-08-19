"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Feature } from 'geojson';

interface MapData {
  dados: any;
  pdsemplano: any;
  produtos: any;
  pdvencendo: any;
  parceiros: any;
  pistas: any[] | null;
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

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingProgress(10); // Iniciando carregamento
      
      // Usar a API para buscar os dados em vez de acessar o S3 diretamente
      setLoadingProgress(20);
      const response = await fetch('/api/proxy-geojson/files');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      setLoadingProgress(40);
      const files = await response.json();
      setLoadingProgress(60);
      
      // Simular um pouco de tempo de processamento para a barra de progresso ser visível
      setTimeout(() => {
        setLoadingProgress(80);
        
        const organizedData = {
          dados: files.find((f: any) => f.name === 'base_municipios.geojson')?.data || null,
          pdsemplano: files.find((f: any) => f.name === 'base_pd_sem_plano.geojson')?.data || null,
          produtos: null,
          pdvencendo: files.find((f: any) => f.name === 'base_pd_vencendo.geojson')?.data || null,
          parceiros: files.find((f: any) => f.name === 'parceiros1.json')?.data || null,
          pistas: files.find((f: any) => f.name === 'pistas_s3.csv')?.data || null,
        };
        try {
          console.log('[MapData] dados.features:', organizedData.dados?.features?.length ?? 0,
            '| pdsemplano:', organizedData.pdsemplano?.features?.length ?? 0,
            '| pdvencendo:', organizedData.pdvencendo?.features?.length ?? 0,
            '| parceiros:', Array.isArray(organizedData.parceiros) ? organizedData.parceiros.length : 0,
            '| pistas:', Array.isArray(organizedData.pistas) ? organizedData.pistas.length : 0);
          if (Array.isArray(organizedData.pistas) && organizedData.pistas.length > 0) {
            console.log('[MapData] exemplo de pista:', organizedData.pistas[0]);
          }
        } catch {}
  
        setLoadingProgress(100);
        setMapData(organizedData);
        setError(null);
        
        // Pequeno atraso para mostrar o 100% completo antes de esconder a barra
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }, 500);
      
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
    await loadData();
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