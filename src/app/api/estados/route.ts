import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
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
    
    // Extrai os estados únicos
    const estados = [...new Set(data.map((item: any) => item.name_state))].filter(Boolean).sort();
    
    return NextResponse.json({ estados });
  } catch (error) {
    console.error('Erro ao carregar estados:', error);
    return NextResponse.json({ error: 'Erro ao carregar estados' }, { status: 500 });
  }
} 