import { NextResponse } from 'next/server';
import { downloadS3File } from '@/utils/s3Service';

// Função para parsear o conteúdo de um arquivo .env
function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignora comentários e linhas vazias
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      result[key.trim()] = value.trim();
    }
  }
  
  return result;
}

export async function GET() {
  try {
    // Buscar o arquivo de configuração correto
    const buffer = await downloadS3File('senhas_s3.json');
    const envContent = buffer.toString('utf-8');
    const envVars = JSON.parse(envContent);
    
    // IMPORTANTE: Apenas retorne variáveis que são seguras para o cliente!
    // Filtre ou omita senhas, tokens e outras informações sensíveis
    const safeEnvVars = {
      // Exemplo de filtro para não expor todas as variáveis:
      APP_NAME: envVars.APP_NAME,
      PUBLIC_API_URL: envVars.PUBLIC_API_URL,
      // Não inclua senhas ou chaves secretas aqui!
    };
    
    return NextResponse.json(safeEnvVars);
  } catch (error) {
    console.error('Erro ao carregar arquivo senhas_s3.json:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar configurações' },
      { status: 500 }
    );
  }
} 