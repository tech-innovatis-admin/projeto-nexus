import { NextResponse } from 'next/server';
import { getFileFromS3 } from '@/utils/s3Service';

export async function GET() {
  try {
    // Buscar o arquivo GeoJSON do S3
    const geojsonData = await getFileFromS3('base_municipios.geojson');
    
    return NextResponse.json(geojsonData);
  } catch (error) {
    console.error('Erro ao carregar dados GeoJSON do S3:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados GeoJSON' }, { status: 500 });
  }
} 