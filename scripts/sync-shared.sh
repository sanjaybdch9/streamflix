#!/usr/bin/env bash
# Copy the shared helpers in services/_shared into every service.
# Services keep their own copies so each one builds and deploys independently.
set -euo pipefail
cd "$(dirname "$0")/../services"

for svc in api-gateway auth-service catalog-service library-service streaming-service recommendation-service; do
  mkdir -p "$svc/src/lib" "$svc/test"
  cp _shared/observability.js "$svc/src/lib/observability.js"
  cp _shared/test-helpers.js "$svc/test/helpers.js"
  cp _shared/Dockerfile "$svc/Dockerfile"
  cp _shared/.dockerignore "$svc/.dockerignore"
done

for svc in auth-service catalog-service library-service; do
  cp _shared/db.js "$svc/src/lib/db.js"
done

# The Helm chart ships its own copy of the Grafana dashboard (charts cannot read files outside their directory).
cp ../monitoring/grafana/dashboards/streamflix-overview.json ../helm/streamflix/dashboards/streamflix-overview.json

echo "Shared helpers synced."
