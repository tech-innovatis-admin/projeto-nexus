import { fetchEnvConfig } from './s3Service';

export async function loadEnvFromS3() {
  try {
    console.log('Carregando variáveis de ambiente do S3 (senhas_s3.json)...');
    const config = await fetchEnvConfig();
    
    if (!config) {
      console.warn('Arquivo senhas_s3.json não encontrado ou vazio');
      return;
    }

    // Injeta as variáveis no process.env
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'string') {
        process.env[key] = value;
        console.log(`Variável ${key} carregada do S3`);
      }
    });

    console.log('Variáveis de ambiente carregadas com sucesso');
  } catch (error) {
    console.error('Erro ao carregar variáveis de ambiente do S3:', error);
    throw error;
  }
} 