import "server-only";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { parse } from 'dotenv';


const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'projeto-nexus-aws';

// Initialize S3 Client using Default Chain (Env, Profile, Role)
const s3Client = new S3Client({
  region: REGION,
  // Credentials are automatically resolved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID...)
  // 2. AWS SSO / AWS Profile (~/.aws/credentials)
  // 3. EC2/dms/Container IAM Roles
});

/**
 * Standard S3 Service for Nexus Project
 */

// --- Core S3 Operations ---

/**
 * Lists objects in a bucket with optional prefix
 */
export async function listBucketObjects(prefix: string = ''): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix
    });

    const response = await s3Client.send(command);
    return response.Contents?.map(c => c.Key || '').filter(Boolean) || [];
  } catch (error) {
    handleS3Error(error, 'ListObjects');
    return [];
  }
}

/**
 * Generates a Presigned URL for GET (Download)
 * Use this for frontend direct access to private objects.
 */
export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    handleS3Error(error, `PresignedURL(GET) ${key}`);
    throw error;
  }
}

/**
 * Generates a Presigned URL for PUT (Upload)
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    handleS3Error(error, `PresignedURL(PUT) ${key}`);
    throw error;
  }
}

/**
 * Gets a file as a Buffer.
 * Replaces old manual stream reading logic.
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  console.log(`📥 S3: Fetching ${key}...`);
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }

    // Convert stream to Buffer
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    handleS3Error(error, `GetFile ${key}`);
    throw error;
  }
}

// --- Legacy Support / Helper Functions ---

/**
 * Download file as string (legacy support for downloadS3File)
 */
export async function downloadS3File(fileName: string): Promise<string> {
  const buffer = await getFileBuffer(fileName);
  const text = buffer.toString('utf-8');
  console.log(`✅ S3: Loaded text file ${fileName} (${text.length} chars)`);
  return text;
}

/**
 * Smart getter that parses JSON/Env/GeoJSON automatically.
 * Refactored to use getFileBuffer.
 */
export async function getFileFromS3(filename: string): Promise<any> {
  const buffer = await getFileBuffer(filename);

  // Binary / Parquet
  if (filename.endsWith('.parquet')) {
    console.log(`✅ S3: Binary ${filename} (${buffer.length} bytes)`);
    return buffer;
  }

  const content = buffer.toString('utf-8');

  // .env Parsing
  if (filename.endsWith('.env')) {
    const parsed = parse(content);
    console.log(`✅ S3: Parsed .env (${Object.keys(parsed).length} keys)`);
    return parsed;
  }

  // JSON / GeoJSON
  if (filename.endsWith('.json') || filename.endsWith('.geojson')) {
    try {
      const parsed = JSON.parse(content);
      const count = Array.isArray(parsed) ? parsed.length :
        (parsed.features ? parsed.features.length : Object.keys(parsed).length);
      console.log(`✅ S3: Parsed JSON ${filename} (~${count} items)`);
      return parsed;
    } catch (e) {
      console.warn(`⚠️ S3: Failed to parse JSON ${filename}, returning raw text.`);
      return content;
    }
  }

  return content;
}

// --- Specific Aggregators (Keep these as they contain domain logic) ---

export async function fetchAllGeoJSONFiles() {
  const fileNames = [
    'base_municipios.geojson',
    'pistas_s3_lat_log.json',
    'sedes_municipais_lat_long.json',
    'municipios_sem_tag.json'
  ];

  console.log(`📥 S3: Batch loading ${fileNames.length} GeoJSON files...`);

  return Promise.all(fileNames.map(async (name) => ({
    name,
    data: await getFileFromS3(name).catch(e => {
      console.error(`❌ Optional file ${name} failed: ${e.message}`);
      return null;
    })
  })));
}

export async function fetchEstrategiaData() {
  const fileNames = [
    'base_polo_valores.geojson',
    'base_polo_periferia.geojson'
  ];

  return Promise.all(fileNames.map(async (name) => ({
    name,
    data: await getFileFromS3(name)
  })));
}

// --- Error Handling ---

function handleS3Error(error: any, context: string) {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('CredentialsProviderError') || msg.includes('Could not load credentials')) {
    console.error(`
🚨 AWS CREDENTIALS MISSING 🚨
------------------------------------------------------------------
Context: ${context}
Error: ${msg}

To fix this in DEVELOPMENT:
1. Run: aws sso login --profile <your-profile>
2. Set env: AWS_PROFILE=<your-profile>
3. Set env: AWS_REGION=${REGION}

To fix this in DOCKER:
1. Mount your .aws folder: -v ~/.aws:/root/.aws
2. Pass env vars: -e AWS_PROFILE=... -e AWS_REGION=...
------------------------------------------------------------------
`);
  } else {
    console.error(`❌ S3 Error [${context}]: ${msg}`);
  }
}

