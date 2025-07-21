import { NextRequest, NextResponse } from "next/server";
import { downloadS3File } from "@/utils/s3Service";
import { join } from "path";

// Esta rota captura solicitações para /api/proxy-geojson/[...path]
// e redireciona para o S3, mantendo o frontend inalterado
export async function GET(request: NextRequest) {
  try {
    // Extrai o caminho solicitado da URL
    const path = request.nextUrl.pathname.replace('/api/proxy-geojson', '');
    
    // Remove a barra inicial se existir
    const fileName = path.startsWith('/') ? path.substring(1) : path;
    
    // Lista de arquivos permitidos
    const allowedFiles = [
      "base_municipios.geojson",
      "base_pd_sem_plano.geojson",
      "base_pd_vencendo.geojson", 

      "parceiros1.json"
    ];
    
    // Extrai apenas o nome do arquivo, sem qualquer caminho
    const fileBaseName = fileName.split('/').pop() || '';
    
    // Verifica se o arquivo é permitido
    if (!allowedFiles.includes(fileBaseName)) {
      return NextResponse.json({ error: "Arquivo não permitido" }, { status: 403 });
    }
    
    console.log(`Buscando arquivo ${fileBaseName} do S3`);
    
    // Busca o arquivo do S3
    const buffer = await downloadS3File(fileBaseName);
    
    // Determina o tipo MIME com base na extensão
    const contentType = fileName.endsWith('.geojson') ? 'application/geo+json' : 'application/json';
    
    // Retorna o conteúdo do arquivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600' // Cache de 1 hora
      }
    });
  } catch (error) {
    console.error("Erro ao buscar arquivo do S3:", error);
    return NextResponse.json(
      { error: "Erro ao carregar arquivo" }, 
      { status: 500 }
    );
  }
} 