#!/usr/bin/env bash
set -euo pipefail

# Build ARM64 (linux/arm64) usando Docker Buildx. Opcionalmente faz push para um registry (ECR).
#
# Exemplos:
#   ./docker/scripts/build-arm64.sh nexus-app v1.0.0
#   AWS_REGION=us-east-1 ECR_URI=123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app ./docker/scripts/build-arm64.sh nexus-app v1.0.0 push

IMAGE_NAME="${1:-nexus-app}"
VERSION="${2:-$(date +%Y%m%d%H%M%S)}"
ACTION="${3:-load}" # load | push
TARGET="${TARGET:-runner}"

ECR_URI="${ECR_URI:-}"           # ex: 123456789012.dkr.ecr.us-east-1.amazonaws.com/nexus-app
AWS_REGION="${AWS_REGION:-us-east-1}"

BUILDER="nexus-builder"
if ! docker buildx ls | grep -q "$BUILDER"; then
  echo "[INFO] Criando builder $BUILDER"
  docker buildx create --name "$BUILDER" --use >/dev/null
fi
docker buildx inspect --bootstrap >/dev/null

if [[ -n "$ECR_URI" ]]; then
  TAG="$ECR_URI:$VERSION-arm64"
else
  TAG="$IMAGE_NAME:$VERSION-arm64"
fi

echo "[INFO] Build ARM64 -> $TAG (target: $TARGET)"

if [[ "$ACTION" == "push" ]]; then
  if [[ -n "$ECR_URI" ]]; then
    if command -v aws >/dev/null 2>&1; then
      REGISTRY="${ECR_URI%%/*}"
      echo "[INFO] Login ECR: $REGISTRY"
      aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
    else
      echo "[ERROR] AWS CLI não encontrado. Instale e configure para push no ECR." >&2
      exit 1
    fi
  fi
  docker buildx build \
    --platform linux/arm64 \
    --target "$TARGET" \
    -t "$TAG" \
    --push \
    .
  echo "[SUCCESS] Build ARM64 concluído e enviado: $TAG"
else
  docker buildx build \
    --platform linux/arm64 \
    --target "$TARGET" \
    -t "$TAG" \
    --load \
    .
  echo "[SUCCESS] Build ARM64 concluído e carregado localmente: $TAG"
fi
