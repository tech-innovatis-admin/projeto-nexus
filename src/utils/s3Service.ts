import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'dotenv';

// Configuração do cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function downloadS3File(fileName: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET || 'projetonexusinnovatis';
  console.log(`Iniciando download do arquivo: ${fileName} do bucket ${bucketName}`);
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });
    
    console.log(`Enviando comando GetObject para: ${bucketName}/${fileName}`);
    const response = await s3Client.send(command);
    console.log(`Resposta recebida para ${fileName}, processando...`);

    if (!response.Body) {
      throw new Error('Corpo da resposta vazio');
    }

    const data = await response.Body.transformToString();
    console.log(`Download de ${fileName} concluído com sucesso.`);
    return data;

  } catch (error) {
    console.error(`Erro detalhado ao baixar arquivo ${fileName} do S3:`, error);
    throw error;
  }
}

async function getFileFromS3(filename: string) {
  const bucketName = process.env.AWS_S3_BUCKET || 'projetonexusinnovatis';
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename
    });

    const response = await s3Client.send(command);
    const stream = response.Body;
    
    if (!stream) {
      throw new Error('Resposta do S3 não contém dados');
    }

    // Converter stream para string
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const fileContent = buffer.toString('utf-8');

    // Se for um arquivo .env, retorna como objeto
    if (filename.endsWith('.env')) {
      return parse(fileContent);
    }

    // Se for um arquivo JSON ou GeoJSON, retorna o objeto parseado
    if (filename.endsWith('.json') || filename.endsWith('.geojson')) {
      return JSON.parse(fileContent);
    }

    // Para outros tipos de arquivo, retorna o conteúdo como string
    return fileContent;
  } catch (error) {
    console.error(`Erro ao buscar arquivo ${filename} do S3:`, error);
    throw error;
  }
}

// Função para buscar todos os arquivos GeoJSON
export async function fetchAllGeoJSONFiles() {
  const fileNames = [
    'base_municipios.geojson',
    'base_pd_sem_plano.geojson',
    'base_produtos.geojson',
    'base_pd_vencendo.geojson',
    'parceiros1.json'
  ];

  try {
    console.log('Iniciando download de todos os arquivos GeoJSON...');
    const files = await Promise.all(
      fileNames.map(async (fileName) => {
        const data = await getFileFromS3(fileName);
        return {
          name: fileName,
          data
        };
      })
    );
    console.log('Download de todos os arquivos GeoJSON concluído com sucesso');
    return files;
  } catch (error) {
    console.error('Erro ao buscar arquivos GeoJSON:', error);
    throw error;
  }
}

// Função para buscar arquivo de configuração
export async function fetchEnvConfig() {
  try {
    const envConfig = await getFileFromS3('senhas_s3.json');
    console.log('Configurações carregadas do S3:', envConfig);
    return envConfig;
  } catch (error) {
    console.error('Erro ao carregar configurações do S3:', error);
    return null;
  }
} 