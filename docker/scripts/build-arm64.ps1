Param(
  [string]$ImageName = "nexus-app",
  [string]$Version = (Get-Date -Format "yyyyMMddHHmmss"),
  [string]$Target = "runner",
  [string]$AwsRegion = "us-east-1",
  [string]$AccountId,
  [string]$Repository,
  [string]$EcrRepoUri,
  [switch]$Push
)

<#
 .SYNOPSIS
  Build de imagem Docker ARM64 (linux/arm64) usando Buildx. Opcionalmente faz push para o ECR.

 .EXAMPLES
  # Somente build local (carrega no Docker Desktop)
  .\docker\scripts\build-arm64.ps1 -ImageName nexus-app -Version v1.0.0

  # Build e push direto para o ECR
  .\docker\scripts\build-arm64.ps1 -Version v1.0.0 -EcrRepoUri 123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app -AwsRegion us-east-1 -Push

  # Build e push com AccountId/Repository
  .\docker\scripts\build-arm64.ps1 -Version v1.0.0 -AccountId 123456789012 -Repository nexus-app -AwsRegion us-east-1 -Push
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-Builder {
  $builderName = "nexus-builder"
  $exists = (docker buildx ls 2>$null | Select-String -SimpleMatch $builderName) -ne $null
  if (-not $exists) {
    Write-Host "[INFO] Criando builder '$builderName'" -ForegroundColor Cyan
    docker buildx create --name $builderName --use | Out-Null
  } else {
    Write-Host "[INFO] Usando builder existente '$builderName'" -ForegroundColor Cyan
    docker buildx use $builderName | Out-Null
  }
  docker buildx inspect --bootstrap | Out-Null
}

function Get-EcrUri {
  if ($EcrRepoUri) { return $EcrRepoUri }
  if ($AccountId -and $Repository) {
    return "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$Repository"
  }
  return $null
}

function Ensure-EcrLogin {
  param([string]$Registry)
  $awsExists = Get-Command aws -ErrorAction SilentlyContinue
  if (-not $awsExists) {
    throw "AWS CLI não encontrado. Instale e configure o AWS CLI para fazer login no ECR."
  }
  Write-Host "[INFO] Fazendo login no ECR: $Registry" -ForegroundColor Cyan
  aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $Registry | Out-Null
}

Ensure-Builder

$repoUri = Get-EcrUri
if ($repoUri) {
  $tag = "${repoUri}:${Version}-arm64"
} else {
  $tag = "${ImageName}:${Version}-arm64"
}

Write-Host "[INFO] Iniciando build ARM64 -> $tag (target: $Target)" -ForegroundColor Green

$buildArgs = @(
  "--platform", "linux/arm64",
  "--target", $Target,
  "-t", $tag,
  "."
)

if ($Push) {
  if ($repoUri) {
    $registry = $repoUri.Split('/')[0]
    Ensure-EcrLogin -Registry $registry
  }
  $buildArgs = @("--platform","linux/arm64","--target",$Target,"-t",$tag,"--push",".")
  docker buildx build @buildArgs
  Write-Host "[SUCCESS] Build ARM64 concluído e enviado: $tag" -ForegroundColor Green
} else {
  # --load carrega a imagem no Docker local (útil para inspeção); em hosts x86 você não conseguirá rodar o container ARM64.
  $buildArgs = @("--platform","linux/arm64","--target",$Target,"-t",$tag,"--load",".")
  docker buildx build @buildArgs
  Write-Host "[SUCCESS] Build ARM64 concluído e carregado localmente: $tag" -ForegroundColor Green
}
