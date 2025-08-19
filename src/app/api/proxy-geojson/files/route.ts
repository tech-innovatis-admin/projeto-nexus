import { NextResponse } from "next/server";
import { fetchAllGeoJSONFiles, fetchPistasData } from "@/utils/s3Service";

export async function GET() {
  try {
    const files = await fetchAllGeoJSONFiles();
    const pistas = await fetchPistasData();
    const result = [
      ...files,
      { name: 'pistas_s3.csv', data: pistas }
    ];
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar arquivos do S3:", error);
    return NextResponse.json(
      { error: "Erro ao carregar arquivos" },
      { status: 500 }
    );
  }
} 