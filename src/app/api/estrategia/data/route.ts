import { NextResponse } from 'next/server';
import { fetchEstrategiaData } from '@/utils/s3Service';

// Mock fallback used when S3 files are missing — keeps the page usable in dev
const mockPoloValores = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        UF_origem: 'SP',
        codigo_origem: '3550308',
        municipio_origem: 'São Paulo',
        soma_valor_total_destino: 123456.78,
        valor_total_origem: 98765.43
      },
      geometry: null
    }
  ]
};

const mockPoloPeriferia = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        UF_origem: 'SP',
        codigo_origem: '3550308',
        codigo_destino: '3509502',
        municipio_origem: 'São Paulo',
        municipio_destino: 'Osasco',
        soma_valor_total_destino: 54321.0,
        valor_total_origem: 11111.11,
        componente_saude: 1000,
        componente_educacao: 2000,
        componente_outros: 3000,
        dist_km_O_D: 12.3
      },
      geometry: null
    }
  ]
};

export async function GET() {
  try {
    const files = await fetchEstrategiaData();

    const result = {
      poloValores: files.find(f => f.name === 'base_polo_valores.geojson')?.data || mockPoloValores,
      poloPeriferia: files.find(f => f.name === 'base_polo_periferia.geojson')?.data || mockPoloPeriferia
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar dados de estratégia do S3:', error);
    return NextResponse.json({ poloValores: mockPoloValores, poloPeriferia: mockPoloPeriferia });
  }
}
