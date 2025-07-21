import { useState, useEffect } from 'react';
import { getFileFromS3, fetchAllGeoJSONFiles, fetchEnvConfig } from '../utils/s3Service';

export function useS3Data() {
  const [geoData, setGeoData] = useState<{
    dados: any;
    pdsemplano: any;
    produtos: any;
    pdvencendo: any;
    parceiros: any;
  } | null>(null);
  const [loginConfig, setLoginConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Buscar todos os arquivos GeoJSON
        const files = await fetchAllGeoJSONFiles();
        
        // Organizar os dados por tipo

        const organizedData = {
          dados: files.find(f => f.name === 'base_municipios.geojson')?.data || null,
          pdsemplano: files.find(f => f.name === 'base_pd_sem_plano.geojson')?.data || null,
          produtos: null, // Adiciona a propriedade produtos como null ou conforme necessário
          pdvencendo: files.find(f => f.name === 'base_pd_vencendo.geojson')?.data || null,
          parceiros: files.find(f => f.name === 'parceiros1.json')?.data || null,
        };

        setGeoData(organizedData);

        // Buscar configuração de login
        const config = await fetchEnvConfig();
        setLoginConfig(config);

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { geoData, loginConfig, loading, error };
} 