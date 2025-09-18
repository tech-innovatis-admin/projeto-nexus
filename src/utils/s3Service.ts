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
      console.log(`✅ Loaded ${filename} (${parsedJson.features?.length || 0} features)`);
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
    'base_pd_sem_plano.geojson',
    'base_pd_vencendo.geojson',
    'parceiros1.json'
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

// Função para buscar e parsear o CSV de pistas
export async function fetchPistasData() {
  console.log(`📥 Loading pistas CSV...`);

  try {
    const csvContent = await getFileFromS3('pistas_s3.csv');

    if (typeof csvContent !== 'string') {
      console.error(`❌ Invalid CSV content type:`, typeof csvContent);
      return [] as any[];
    }

    const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [] as any[];

    const headerLine = lines[0];
    const delimiter = (headerLine.split(';').length - 1) >= (headerLine.split(',').length - 1) ? ';' : ',';

    const rawHeaders = headerLine.split(delimiter).map(h => h.trim());
    const headers = rawHeaders.map(h => h.replace(/^"|"$/g, ''));

    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const rawRow = lines[i].split(delimiter);
      if (rawRow.length !== headers.length) continue;

      const obj: any = {};
      headers.forEach((h, idx) => {
        const v = (rawRow[idx] ?? '').trim().replace(/^"|"$/g, '');
        obj[h] = v;
      });

      records.push(obj);
    }

    console.log(`✅ Loaded ${records.length} pista records from CSV`);
    return records;
  } catch (error) {
    console.error(`❌ Error loading pistas CSV:`, error instanceof Error ? error.message : error);
    return [] as any[];
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
