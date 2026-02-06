import { NextResponse } from 'next/server';
import { getFileFromS3 } from '@/utils/s3Service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/polos/data
 * Retorna os dados necessários para a página de polos:
 * - base_municipios.geojson (S3)
 * - municipios_com_relacionamento (PostgreSQL)
 */
export async function GET() {
  try {
    // Buscar dados em paralelo para melhor performance
    const [baseMunicipios, municipiosRelacionamento] = await Promise.all([
      // 1. Buscar base_municipios.geojson do S3
      getFileFromS3('base_municipios.geojson').catch((err: unknown) => {
        console.error('Erro ao buscar base_municipios.geojson do S3:', err);
        return null;
      }),

      // 2. Buscar municipios_com_relacionamento do PostgreSQL
      prisma.municipios_com_relacionamento.findMany({
        orderBy: [
          { name_state: 'asc' },
          { name_muni: 'asc' }
        ]
      }).catch((err: unknown) => {
        console.error('Erro ao buscar municipios_com_relacionamento do banco:', err);
        return [];
      })
    ]);

    // Validar e estruturar resposta
    const response = {
      baseMunicipios: baseMunicipios || {
        type: 'FeatureCollection',
        features: []
      },
      municipiosRelacionamento: municipiosRelacionamento || [],
      metadata: {
        totalMunicipios: baseMunicipios?.features?.length || 0,
        totalRelacionamentos: municipiosRelacionamento?.length || 0,
        loadedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar dados de polos:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar dados de polos',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
        baseMunicipios: { type: 'FeatureCollection', features: [] },
        municipiosRelacionamento: [],
        metadata: { totalMunicipios: 0, totalRelacionamentos: 0, loadedAt: new Date().toISOString() }
      },
      { status: 500 }
    );
  }
}
