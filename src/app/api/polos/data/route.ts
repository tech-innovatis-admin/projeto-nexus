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

    // 3. Derivar municípios satélites (vizinhança Queen, 1ª ordem) a partir dos Polos Estratégicos (relacionamento_ativo=true)
    type RelacionamentoRow = { code_muni: string; relacionamento_ativo?: boolean | null };
    const municipiosRelacionamentoRows = (municipiosRelacionamento || []) as RelacionamentoRow[];

    const strategicCodes = Array.from(
      new Set(
        municipiosRelacionamentoRows
          .filter((m: RelacionamentoRow) => Boolean(m?.relacionamento_ativo))
          .map((m: RelacionamentoRow) => String(m.code_muni))
          .filter(Boolean)
      )
    );

    const municipiosSatelites =
      strategicCodes.length === 0
        ? []
        : Array.from(
            new Set(
              (
                await prisma.municipio_vizinhanca_queen
                  .findMany({
                    where: {
                      code_muni_a: { in: strategicCodes },
                      ordem: 1,
                    },
                    select: { code_muni_b: true },
                  })
                  .catch((err: unknown) => {
                    console.error('Erro ao buscar vizinhança queen do banco:', err);
                    return [];
                  })
              )
                .map((row: { code_muni_b: string }) => String(row.code_muni_b))
                .filter(Boolean)
            )
          );

    // Validar e estruturar resposta
    const response = {
      baseMunicipios: baseMunicipios || {
        type: 'FeatureCollection',
        features: []
      },
      municipiosRelacionamento: municipiosRelacionamento || [],
      municipiosSatelites,
      metadata: {
        totalMunicipios: baseMunicipios?.features?.length || 0,
        totalRelacionamentos: municipiosRelacionamento?.length || 0,
        totalSatelites: municipiosSatelites.length,
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
