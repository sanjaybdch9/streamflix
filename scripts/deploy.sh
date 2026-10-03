#!/usr/bin/env bash
# Build all 7 images for linux/amd64, push them to ECR, and deploy with Helm.
# The manual equivalent of the Jenkins pipeline.
# Usage: scripts/deploy.sh [region] [cluster-name]
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="${1:-ap-south-1}"
CLUSTER="${2:-streamflix}"
NAMESPACE="${NAMESPACE:-streamflix}"
SERVICES="api-gateway auth-service catalog-service library-service streaming-service recommendation-service"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
# Tag with the git commit; append -dirty so uncommitted builds are never mistaken for a commit.
TAG="$(git rev-parse --short=12 HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
if [ -n "$(git status --porcelain . 2>/dev/null)" ]; then TAG="$TAG-dirty-$(date +%H%M%S)"; fi

echo "==> Registry $REGISTRY  tag $TAG  cluster $CLUSTER ($REGION)"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

# EKS t3 nodes are x86_64. Without --platform, an Apple Silicon Mac builds arm64 images
# that crash on the nodes with "exec format error".
build_push() {
  local name="$1" context="$2"
  echo "==> Building $name"
  docker build --platform linux/amd64 -t "$REGISTRY/streamflix/$name:$TAG" "$context"
  docker push "$REGISTRY/streamflix/$name:$TAG"
}
for svc in $SERVICES; do build_push "$svc" "services/$svc"; done
build_push frontend frontend

echo "==> Deploying with Helm"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER" >/dev/null
if helm version --short | grep -q '^v3'; then ROLLBACK=--atomic; else ROLLBACK=--rollback-on-failure; fi
helm upgrade --install streamflix helm/streamflix \
  --namespace "$NAMESPACE" --create-namespace \
  -f helm/streamflix/values-eks.yaml \
  --set global.imageRegistry="$REGISTRY" \
  --set global.imageTag="$TAG" \
  "$ROLLBACK" --wait --timeout 10m

echo "==> Smoke test"
kubectl -n "$NAMESPACE" run "smoke-$(date +%s)" --rm -i --restart=Never --image=curlimages/curl:8.14.1 -- \
  curl -fsS --retry 10 --retry-delay 6 --retry-all-errors http://api-gateway:4000/api/status
echo
HOST="$(kubectl -n "$NAMESPACE" get svc frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo "==> Done. App: http://$HOST  (DNS for a new load balancer can take 2-3 minutes)"
