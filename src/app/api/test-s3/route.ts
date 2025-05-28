import { NextResponse } from "next/server";
import { downloadS3File } from "@/utils/s3";

export async function GET() {
  try {
    // Tenta buscar um arquivo pequeno para testar a conexão com o S3
    const buffer = await downloadS3File("parceiros1.json");
    
    return NextResponse.json({ 
      success: true, 
      message: "Conexão com S3 funcionando corretamente",
      fileSize: buffer.length,
      // Não exibe o conteúdo inteiro, apenas para confirmar que há dados
      preview: buffer.toString("utf-8").substring(0, 100) + "..."
    });
  } catch (error) {
    console.error("Erro na conexão com o S3:", error);
    
    // Verifica se as variáveis de ambiente estão configuradas
    const configStatus = {
      AWS_REGION: process.env.AWS_REGION ? "Configurado" : "Não configurado",
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "Configurado" : "Não configurado",
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "Configurado" : "Não configurado",
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ? "Configurado" : "Não configurado"
    };
    
    return NextResponse.json({ 
      success: false, 
      message: "Falha na conexão com S3",
      error: error instanceof Error ? error.message : String(error),
      configStatus
    }, { status: 500 });
  }
} 