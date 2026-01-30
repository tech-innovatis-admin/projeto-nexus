# Deploy da Imagem NEXUS para EC2 ARM64 usando AWS Systems Manager

Param(
    [string]$InstanceId = "i-0f97359729f6589f6",
    [string]$ImageUri = "891612552945.dkr.ecr.us-east-1.amazonaws.com/nexus-app:v1.0.1-arm64",
    [string]$AwsProfile = "Innovatis",
    [string]$Region = "us-east-1"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXUS - Deploy para EC2 ARM64 via SSM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Obtendo token de login do ECR..." -ForegroundColor Green
$ecrPassword = aws ecr get-login-password --region $Region --profile $AwsProfile

Write-Host "[2/4] Preparando comandos de deploy..." -ForegroundColor Green

# Script bash que sera executado na instancia
$deployCommands = @"
#!/bin/bash
set -e

echo '======================================'
echo '  Deploy NEXUS ARM64 na Instancia EC2'
echo '======================================'
echo ''

# Login no ECR
echo '[1/5] Fazendo login no ECR...'
echo '$ecrPassword' | docker login --username AWS --password-stdin 891612552945.dkr.ecr.us-east-1.amazonaws.com

# Parar e remover container antigo
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
  -e DATABASE_URL="\`${DATABASE_URL}\`" \
  -e JWT_SECRET="\`${JWT_SECRET}\`" \
  -e GOOGLE_MAPS_API_KEY="\`${GOOGLE_MAPS_API_KEY}\`" \
  -e AWS_REGION="\`${AWS_REGION}\`" \
  -e AWS_S3_BUCKET="\`${AWS_S3_BUCKET}\`" \
  -e MAPS_DISABLED="false" \
  -e MAPS_DAILY_CAP_ROUTES="1000" \
  -e MAPS_DAILY_CAP_GEOCODE="1000" \
  $ImageUri

# Verificar status
echo '[5/5] Verificando status do container...'
sleep 5
docker ps | grep nexus-app || echo 'Erro: Container nao esta rodando'

echo ''
echo '======================================'
echo '  Deploy concluido!'
echo '======================================'
"@

# Converter para base64 para enviar via SSM
$deployCommandsBytes = [System.Text.Encoding]::UTF8.GetBytes($deployCommands)
$deployCommandsBase64 = [Convert]::ToBase64String($deployCommandsBytes)

Write-Host "[3/4] Executando deploy via AWS Systems Manager..." -ForegroundColor Green

# Executar comando via SSM
$commandId = aws ssm send-command `
  --instance-ids $InstanceId `
  --document-name "AWS-RunShellScript" `
  --parameters "commands=[`"echo $deployCommandsBase64 | base64 -d | bash`"]" `
  --profile $AwsProfile `
  --region $Region `
  --output text `
  --query "Command.CommandId"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao enviar comando via SSM" -ForegroundColor Red
    exit 1
}

Write-Host "      Command ID: $commandId" -ForegroundColor Gray
Write-Host "[4/4] Aguardando execucao..." -ForegroundColor Green

# Aguardar conclusao do comando
$maxWait = 120  # 2 minutos
$waited = 0
$status = "InProgress"

while ($status -eq "InProgress" -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --profile $AwsProfile `
        --region $Region `
        --query "Status" `
        --output text 2>$null
    
    if ($status) {
        Write-Host "      Status: $status (${waited}s)" -ForegroundColor Gray
    }
}

# Obter output do comando
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Output do Deploy:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$output = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --profile $AwsProfile `
    --region $Region `
    --query "StandardOutputContent" `
    --output text

Write-Host $output

$errorOutput = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --profile $AwsProfile `
    --region $Region `
    --query "StandardErrorContent" `
    --output text

if ($errorOutput -and $errorOutput.Trim()) {
    Write-Host ""
    Write-Host "Erros:" -ForegroundColor Yellow
    Write-Host $errorOutput -ForegroundColor Yellow
}

# Obter IP da instancia
$instanceIp = aws ec2 describe-instances `
    --instance-ids $InstanceId `
    --profile $AwsProfile `
    --region $Region `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy finalizado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Aplicacao disponivel em:" -ForegroundColor Cyan
Write-Host "  http://${instanceIp}:3000" -ForegroundColor White
Write-Host ""
Write-Host "Health Check:" -ForegroundColor Cyan
Write-Host "  http://${instanceIp}:3000/api/health" -ForegroundColor White
Write-Host ""

