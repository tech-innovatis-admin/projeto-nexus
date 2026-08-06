import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envLocalPath = path.join(root, '.env.local');
const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.join(root, '.env');

const secretRaw = execSync(
  'aws secretsmanager get-secret-value --secret-id innovatis/sso/dev/nexus-web --query SecretString --output text',
  {
    env: {
      ...process.env,
      AWS_PROFILE: process.env.AWS_PROFILE || 'innovatis-admin',
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    },
    encoding: 'utf8',
  }
)
  .replace(/^\uFEFF/, '')
  .trim();

const cognito = JSON.parse(secretRaw);
const issuer = `https://cognito-idp.us-east-1.amazonaws.com/${cognito.user_pool_id}`;

const block = `
# --- Cognito SSO (Nexus) ---
AUTH_MODE=hybrid
PLATFORM_CODE=nexus
APP_URL=http://localhost:3005
COGNITO_USER_POOL_ID=${cognito.user_pool_id}
COGNITO_CLIENT_ID=${cognito.client_id}
COGNITO_CLIENT_SECRET=${cognito.client_secret}
COGNITO_DOMAIN=https://innovatis-sso-dev.auth.us-east-1.amazoncognito.com
COGNITO_REDIRECT_URI=http://localhost:3005/auth/callback
COGNITO_LOGOUT_URI=http://localhost:3005/login
COGNITO_ISSUER=${issuer}
COGNITO_SCOPES=openid email profile
`;

let current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (current.includes('COGNITO_USER_POOL_ID=')) {
  console.log('Cognito env already present — skipping append');
  process.exit(0);
}

fs.appendFileSync(envPath, block, 'utf8');
console.log('Appended Cognito SSO vars to', path.basename(envPath), 'with AUTH_MODE=hybrid');
console.log('COGNITO_USER_POOL_ID=', cognito.user_pool_id);
console.log('COGNITO_CLIENT_ID=', cognito.client_id);
