const { S3Client, ListObjectsV2Command, GetCallerIdentityCommand } = require('@aws-sdk/client-s3');
const { STSClient, GetCallerIdentityCommand: STSGetCallerIdentityCommand } = require('@aws-sdk/client-sts');

// Configuração
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'projetonexusinnovatis';
const REGION = process.env.AWS_REGION || 'us-east-1';
const PROFILE = process.env.AWS_PROFILE || 'Não definido';

console.log('\n🔍 --- DIAGNÓSTICO AWS S3 ---');
console.log(`🌍 Região: ${REGION}`);
console.log(`👤 Perfil (AWS_PROFILE): ${PROFILE}`);
console.log(`📦 Bucket: ${BUCKET_NAME}`);
console.log('--------------------------------\n');

async function testConnection() {
    try {
        // 1. Testar Identidade (Quem sou eu?)
        console.log('1️⃣  Testando Identidade (STS)...');
        const sts = new STSClient({ region: REGION });
        const identity = await sts.send(new STSGetCallerIdentityCommand({}));
        console.log(`✅ Logado como: ${identity.Arn}`);
        console.log(`   Account: ${identity.Account}`);
        console.log(`   UserId: ${identity.UserId}\n`);

        // 2. Testar Listagem no S3
        console.log(`2️⃣  Testando Acesso ao Bucket '${BUCKET_NAME}'...`);
        const s3 = new S3Client({ region: REGION });
        const listCmd = new ListObjectsV2Command({ Bucket: BUCKET_NAME, MaxKeys: 1 });
        const s3Res = await s3.send(listCmd);

        console.log(`✅ Sucesso! Conectado ao bucket.`);
        console.log(`   Arquivos encontrados (amostra): ${s3Res.KeyCount || 0}`);
        if (s3Res.Contents && s3Res.Contents.length > 0) {
            console.log(`   -> ${s3Res.Contents[0].Key}`);
        } else {
            console.log('   (Bucket vazio ou sem permissão de listagem completa)');
        }

    } catch (error) {
        console.error('\n❌ ERRO DETECTADO:');
        console.error(`   Tipo: ${error.name}`);
        console.error(`   Mensagem: ${error.message}`);

        if (error.name === 'CredentialsProviderError') {
            console.log('\n💡 DICA: O Node.js não conseguiu encontrar credenciais.');
            console.log('   Certifique-se de que rodou: aws sso login --profile <seu-perfil>');
            console.log('   E definiu: $env:AWS_PROFILE="<seu-perfil>" (PowerShell)');
        }

        if (error.Code === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
            console.log('\n💡 DICA: Credenciais válidas, mas sem permissão no Bucket.');
            console.log('   Verifique se a conta logada tem permissão de leitura neste bucket específico.');
        }
    }
}

testConnection();
