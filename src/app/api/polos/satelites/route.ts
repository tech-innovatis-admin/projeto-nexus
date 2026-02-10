import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/polos/satelites
 * Retorna apenas os municípios satélites (vizinhos Queen 1ª ordem dos Polos Estratégicos).
 * Não toca no S3 - usa apenas PostgreSQL.
 * Útil para refresh rápido após cadastro de relacionamentos.
 */
export async function GET() {
  try {
    const municipiosRelacionamento = await prisma.municipios_com_relacionamento.findMany({
      select: { code_muni: true, relacionamento_ativo: true },
    });

    const strategicCodes = Array.from(
      new Set(
        municipiosRelacionamento
          .filter((m) => Boolean(m.relacionamento_ativo))
          .map((m) => String(m.code_muni))
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
              )
                .map((row) => String(row.code_muni_b))
                .filter(Boolean)
            )
          );

    return NextResponse.json({
      municipiosSatelites,
      totalSatelites: municipiosSatelites.length,
      loadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar municípios satélites:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar municípios satélites',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
        municipiosSatelites: [],
        totalSatelites: 0,
        loadedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
