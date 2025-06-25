import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: { estado: string } }
) {
  try {
    const estado = params.estado;
    
    // Caminho para o arquivo Excel
    const filePath = path.join(process.cwd(), 'public', 'municipios.xlsx');
    
    // Lê o arquivo Excel
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Obtém a primeira planilha
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Filtra os municípios pelo estado
    const municipios = data
      .filter((item: any) => item.name_state === estado)
      .map((item: any) => item.nome_municipio)
      .filter(Boolean)
      .sort();
    
    return NextResponse.json({ municipios });
  } catch (error) {
    console.error(`Erro ao carregar municípios do estado ${params.estado}:`, error);
    return NextResponse.json({ error: 'Erro ao carregar municípios' }, { status: 500 });
  }
} 