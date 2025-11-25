# Deploy da Imagem NEXUS para EC2 ARM64

Param(
    [string]$KeyPath = "saep-backend-key.pem",
    [string]$InstanceIp = "98.91.74.236",
    [string]$ImageUri = "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.1-arm64",
    [string]$AwsProfile = "Innovatis",
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXUS - Deploy para EC2 ARM64" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se a chave SSH existe
if (-not (Test-Path $KeyPath)) {
    Write-Host "[ERRO] Chave SSH nao encontrada: $KeyPath" -ForegroundColor Red
    Write-Host "Por favor, forneca o caminho correto da chave usando: -KeyPath 'caminho/para/sua-chave.pem'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Obtendo token de login do ECR..." -ForegroundColor Green
$ecrPassword = aws ecr get-login-password --region $Region --profile $AwsProfile

Write-Host "[2/5] Conectando a instancia EC2..." -ForegroundColor Green
Write-Host "      IP: $InstanceIp" -ForegroundColor Gray

# Criar script de deploy para executar na instancia
$deployScript = @"
#!/bin/bash
set -e

echo '======================================'
echo '  Deploy NEXUS ARM64 na Instancia EC2'
echo '======================================'
echo ''

# Login no ECR
echo '[1/5] Fazendo login no ECR...'
echo '$ecrPassword' | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# Parar e remover container antigo (se existir)
echo '[2/5] Parando containers antigos...'
docker stop nexus-app 2>/dev/null || true
docker rm nexus-app 2>/dev/null || true

# Pull da nova imagem
echo '[3/5] Baixando nova imagem do ECR...'
docker pull $ImageUri

# Iniciar novo container
echo '[4/5] Iniciando novo container...'
docker run -d \
  --name nexus-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="\${DATABASE_URL}" \
  -e JWT_SECRET="\${JWT_SECRET}" \
  -e GOOGLE_MAPS_API_KEY="\${GOOGLE_MAPS_API_KEY}" \
  -e AWS_ACCESS_KEY_ID="\${AWS_ACCESS_KEY_ID}" \
  -e AWS_SECRET_ACCESS_KEY="\${AWS_SECRET_ACCESS_KEY}" \
  -e AWS_REGION="\${AWS_REGION}" \
  -e AWS_S3_BUCKET="\${AWS_S3_BUCKET}" \
  -e MAPS_DISABLED="false" \
  -e MAPS_DAILY_CAP_ROUTES="1000" \
  -e MAPS_DAILY_CAP_GEOCODE="1000" \
  $ImageUri

# Verificar status
echo '[5/5] Verificando status do container...'
sleep 5
docker ps | grep nexus-app

echo ''
echo '======================================'
echo '  X Deploy concluido com sucesso!'
echo '======================================'
echo ''
echo 'Container rodando em: http://$InstanceIp:3000'
echo 'Health check: http://$InstanceIp:3000/api/health'
echo ''
"@

# Salvar script temporario
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "[3/5] Copiando script de deploy para a instancia..." -ForegroundColor Green
scp -i $KeyPath -o StrictHostKeyChecking=no $tempScript ubuntu@${InstanceIp}:/tmp/deploy.sh

Write-Host "[4/5] Executando deploy na instancia..." -ForegroundColor Green
ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${InstanceIp} "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

Write-Host "[5/5] Limpando arquivos temporarios..." -ForegroundColor Green
Remove-Item $tempScript -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  X Deploy finalizado com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Aplicacao disponivel em:" -ForegroundColor Cyan
Write-Host "  http://$InstanceIp:3000" -ForegroundColor White
Write-Host ""
Write-Host "Health Check:" -ForegroundColor Cyan
Write-Host "  http://$InstanceIp:3000/api/health" -ForegroundColor White
Write-Host ""

