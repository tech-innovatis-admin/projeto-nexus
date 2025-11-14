import { NextResponse } from "next/server";
import { downloadS3File } from "@/utils/s3Service";

export async function GET() {
  const results = {
    environment: {
      AWS_REGION: process.env.AWS_REGION || 'não definido',
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'não definido',
      // Não mostrar as chaves de acesso por questões de segurança
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'configurado' : 'não definido',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'configurado' : 'não definido',
    },
    tests: {} as Record<string, any>
  };

  // Teste 1: Verificar acesso ao arquivo parceiros1.json
  try {
    const data = await downloadS3File("parceiros1.json");
    results.tests.parceiros1 = {
      success: true,
      size: data.length,
      preview: data.substring(0, 50) + "..."
    };
  } catch (error) {
    results.tests.parceiros1 = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Teste 2: Verificar acesso ao arquivo senhas_s3.json
  try {
    const buffer = await downloadS3File("senhas_s3.json");
    results.tests.senhas_s3 = {
      success: true,
      size: buffer.length,
      // Somente mostrar que foi carregado, não o conteúdo por segurança
      hasContent: buffer.length > 0
    };
  } catch (error) {
    results.tests.senhas_s3 = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Teste 3: Verificar se conseguimos carregar um dos arquivos GeoJSON
  try {
    const buffer = await downloadS3File("base_municipios.geojson");
    results.tests.base_municipios = {
      success: true,
      size: buffer.length
    };
  } catch (error) {
    results.tests.base_municipios = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Teste 4: Verificar se o arquivo senhas_s3.json está em outra pasta
  try {
    const buffer = await downloadS3File("configs/senhas_s3.json");
    results.tests.senhas_s3_in_configs = {
      success: true,
      size: buffer.length,
      hasContent: buffer.length > 0
    };
  } catch (error) {
    results.tests.senhas_s3_in_configs = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  return NextResponse.json(results);
} 