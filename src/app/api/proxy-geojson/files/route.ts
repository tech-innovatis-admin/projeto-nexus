import { NextResponse } from "next/server";
import { fetchAllGeoJSONFiles } from "@/utils/s3Service";

export async function GET() {
  try {
    const files = await fetchAllGeoJSONFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error("Erro ao buscar arquivos do S3:", error);
    return NextResponse.json(
      { error: "Erro ao carregar arquivos" },
      { status: 500 }
    );
  }
} 