import "server-only";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'dotenv';


// Configuração do cliente S3
console.log('🔧 S3 Client - Access Key:', process.env.AWS_ACCESS_KEY_ID ? 'OK' : '❌ MISSING');
console.log('🔧 S3 Client - Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'OK' : '❌ MISSING');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function downloadS3File(fileName: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET || 'projetonexusinnovatis';
  console.log(`📥 Downloading ${fileName} from S3...`);

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      console.error(`❌ Empty response for ${fileName}`);
      throw new Error('Corpo da resposta vazio');
    }

    const data = await response.Body.transformToString();
    console.log(`✅ Downloaded ${fileName} (${data.length} chars)`);

    return data;

  } catch (error) {
    console.error(`❌ S3 Error for ${fileName}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function getFileFromS3(filename: string) {
  const bucketName = process.env.AWS_S3_BUCKET || 'projetonexusinnovatis';
  console.log(`📥 Getting ${filename} from S3...`);

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename
    });

    const response = await s3Client.send(command);
    const stream = response.Body;

    if (!stream) {
      console.error(`❌ Empty stream for ${filename}`);
      throw new Error('Resposta do S3 não contém dados');
    }

    // Converter stream para string
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Para arquivos binários (Parquet), retornar o Buffer diretamente
    if (filename.endsWith('.parquet')) {
      console.log(`✅ Loaded binary file ${filename} (${buffer.length} bytes)`);
      return buffer;
    }

    // Para arquivos de texto, converter para string
    const fileContent = buffer.toString('utf-8');

    // Se for um arquivo .env, retorna como objeto
    if (filename.endsWith('.env')) {
      const parsedEnv = parse(fileContent);
      console.log(`✅ Parsed .env file with ${Object.keys(parsedEnv).length} variables`);
      return parsedEnv;
    }

    // Se for um arquivo JSON ou GeoJSON, retorna o objeto parseado
    if (filename.endsWith('.json') || filename.endsWith('.geojson')) {
      const parsedJson = JSON.parse(fileContent);

      // Para arquivos GeoJSON (com features)
      if (parsedJson.type === 'FeatureCollection' && parsedJson.features) {
        console.log(`✅ Loaded ${filename} (${parsedJson.features.length} features)`);
      }
      // Para arrays de dados tabulares (como pistas)
      else if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        console.log(`✅ Loaded ${filename} (${parsedJson.length} records)`);
      }
      // Para outros objetos JSON
      else {
        console.log(`✅ Loaded ${filename} (${Object.keys(parsedJson).length} properties)`);
      }

      return parsedJson;
    }

    console.log(`✅ Loaded ${filename} (${fileContent.length} chars)`);
    return fileContent;
  } catch (error) {
    console.error(`❌ S3 Error for ${filename}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Função para buscar todos os arquivos GeoJSON
export async function fetchAllGeoJSONFiles() {
  const fileNames = [
    'base_municipios.geojson',
    'parceiros1.json',
    'pistas_s3_lat_log.json',
    'sedes_municipais_lat_long.json'
  ];

  console.log(`📥 Loading ${fileNames.length} GeoJSON files...`);

  try {
    const files = await Promise.all(
      fileNames.map(async (fileName) => {
        const data = await getFileFromS3(fileName);
        return {
          name: fileName,
          data
        };
      })
    );

    console.log(`✅ All ${files.length} files loaded successfully`);
    return files;
  } catch (error) {
    console.error(`❌ Error loading GeoJSON files:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

// Função para buscar arquivo de configuração
export async function fetchEnvConfig() {
  console.log(`📥 Loading config file...`);

  try {
    const envConfig = await getFileFromS3('senhas_s3.json');
    console.log(`✅ Config loaded successfully`);
    return envConfig;
  } catch (error) {
    console.error(`❌ Error loading config:`, error instanceof Error ? error.message : error);
    return null;
  }
} 
// Função para buscar os arquivos usados pela página /estrategia
export async function fetchEstrategiaData() {
  const fileNames = [
    'base_polo_valores.geojson',
    'base_polo_periferia.geojson'
  ];

  console.log(`📥 Loading estrategia data (${fileNames.length} files)...`);

  try {
    const files = await Promise.all(
      fileNames.map(async (fileName) => {
        const data = await getFileFromS3(fileName);
        return {
          name: fileName,
          data
        };
      })
    );

    console.log(`✅ All estrategia files loaded successfully`);
    return files;
  } catch (error) {
    console.error(`❌ Error loading estrategia data:`, error instanceof Error ? error.message : error);
    throw error;
  }
}
