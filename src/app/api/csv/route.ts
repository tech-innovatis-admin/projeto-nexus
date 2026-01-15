import { NextRequest, NextResponse } from 'next/server';
import { downloadS3File } from '@/utils/s3Service';

/**
 * GET /api/csv
 * Baixa arquivos CSV do S3
 *
 * Uso:
 * - /api/csv (lista arquivos disponíveis)
 * - /api/csv?file=municipios_negociacao.csv (baixa arquivo específico)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('file');

    // Lista de arquivos CSV permitidos
    const allowedCsvFiles = [
      "municipios_negociacao.csv"
    ];

    // Se nenhum arquivo for especificado, retorna lista de arquivos disponíveis
    if (!fileName) {
      return NextResponse.json({
        message: "Endpoint para download de arquivos CSV do S3",
        usage: "/api/csv?file=nome_do_arquivo.csv",
        availableFiles: allowedCsvFiles,
        example: "/api/csv?file=municipios_negociacao.csv"
      });
    }

    // Extrai apenas o nome do arquivo, sem qualquer caminho
    const fileBaseName = fileName.split('/').pop() || '';

    // Verifica se o arquivo é permitido
    if (!allowedCsvFiles.includes(fileBaseName)) {
      return NextResponse.json({
        error: "Arquivo CSV não permitido",
        availableFiles: allowedCsvFiles
      }, { status: 403 });
    }

    // Verifica se é realmente um arquivo CSV
    if (!fileBaseName.endsWith('.csv')) {
      return NextResponse.json({
        error: "Apenas arquivos CSV são permitidos neste endpoint",
        fileRequested: fileBaseName
      }, { status: 400 });
    }

    console.log(`📊 Baixando arquivo CSV ${fileBaseName} do S3`);

    // Busca o arquivo do S3
    const csvContent = await downloadS3File(fileBaseName);

    console.log(`📊 Arquivo CSV ${fileBaseName} baixado com sucesso (${csvContent.length} caracteres)`);

    // Retorna o conteúdo do arquivo CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Length': Buffer.byteLength(csvContent, 'utf-8').toString(),
        'Cache-Control': 'public, max-age=3600', // Cache de 1 hora
        'Content-Disposition': `attachment; filename="${fileBaseName}"`
      }
    });

  } catch (error) {
    console.error("Erro ao buscar arquivo CSV do S3:", error);
    return NextResponse.json(
      {
        error: "Erro ao carregar arquivo CSV",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
