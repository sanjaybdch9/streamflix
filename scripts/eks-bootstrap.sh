#!/usr/bin/env bash
# One-time cluster add-ons after `terraform apply`:
#   - metrics-server         (powers the HorizontalPodAutoscalers)
#   - kube-prometheus-stack  (Prometheus, Grafana, Alertmanager; scrapes StreamFlix via ServiceMonitor)
# Usage: scripts/eks-bootstrap.sh [region] [cluster-name]
set -euo pipefail

REGION="${1:-ap-south-1}"
CLUSTER="${2:-streamflix}"

aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update >/dev/null

helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system --wait

GRAFANA_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-$(openssl rand -hex 16)}"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword="$GRAFANA_PASSWORD" \
  --set grafana.sidecar.dashboards.enabled=true \
  --set grafana.sidecar.dashboards.searchNamespace=ALL \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --wait --timeout 10m

echo
echo "Cluster add-ons installed."
echo "Grafana:  kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80"
echo "          user: admin   password: $GRAFANA_PASSWORD"
