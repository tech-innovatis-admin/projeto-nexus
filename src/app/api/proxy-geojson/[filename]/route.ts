import { getFileFromS3 } from '@/utils/s3Service';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    console.log(`Buscando arquivo ${filename} do S3`);

    const data = await getFileFromS3(filename);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error(`Erro ao buscar arquivo do S3:`, error);
    return new Response(JSON.stringify({ error: 'Erro ao buscar arquivo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
