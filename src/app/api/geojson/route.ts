import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Caminho para o arquivo GeoJSON
    const filePath = path.join(process.cwd(), 'public', 'data', 'base_municipios.geojson');
    
    // Lê o arquivo GeoJSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const geojsonData = JSON.parse(fileContent);
    
    return NextResponse.json(geojsonData);
  } catch (error) {
    console.error('Erro ao carregar dados GeoJSON:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados GeoJSON' }, { status: 500 });
  }
} 