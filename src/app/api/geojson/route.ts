import { NextResponse } from "next/server";
import { downloadS3File } from "@/utils/s3Service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  
  if (!file) {
    return NextResponse.json({ error: "Arquivo não especificado" }, { status: 400 });
  }

  // Lista de arquivos permitidos para evitar acesso não autorizado
  const allowedFiles = [
    "base_municipios.geojson",
    "base_pd_sem_plano.geojson",
    "base_pd_vencendo.geojson", 
    "base_produtos.geojson",
    "parceiros1.json"
  ];

  if (!allowedFiles.includes(file)) {
    return NextResponse.json({ error: "Arquivo não permitido" }, { status: 403 });
  }

  try {
    const buffer = await downloadS3File(file);
    const json = JSON.parse(buffer.toString("utf-8"));
    return NextResponse.json(json);
  } catch (error) {
    console.error("Erro ao buscar arquivo do S3:", error);
    return NextResponse.json(
      { error: "Erro ao carregar arquivo do S3" }, 
      { status: 500 }
    );
  }
} 