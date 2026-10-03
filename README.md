# StreamFlix

A Netflix-style video streaming platform built as a **three-tier, microservice** application, with
the full DevOps lifecycle: Docker, Docker Compose, Kubernetes (Helm), Prometheus/Grafana, Terraform
on AWS EKS, and a Jenkins CI/CD pipeline.

```mermaid
flowchart LR
  user([Browser]) --> fe

  subgraph T1[Tier 1 · Presentation]
    fe[frontend<br/>React + nginx :8080]
  end

  subgraph T2[Tier 2 · Application]
    gw[api-gateway :4000<br/>JWT · rate limit · routing]
    auth[auth-service :4001]
    cat[catalog-service :4002]
    lib[library-service :4003]
    str[streaming-service :4004]
    rec[recommendation-service :4005]
  end

  subgraph T3[Tier 3 · Data]
    pg[(PostgreSQL<br/>auth_db · catalog_db · library_db)]
    rd[(Redis cache)]
  end

  fe -- /api --> gw
  gw --> auth & cat & lib & str & rec
  auth --> pg
  cat --> pg
  cat --> rd
  lib --> pg
  lib -. titles .-> cat
  str -. source URL .-> cat
  rec -. titles .-> cat
  rec -. viewing signals .-> lib
  str == byte ranges ==> origin[(Video origin / CDN)]
```

## Features

| Area | What it does |
|---|---|
| Accounts | Sign up / sign in, bcrypt-hashed passwords, 12-hour JWTs, admin role via `ADMIN_EMAILS` |
| Browse | Rotating hero billboard, Trending, New Releases, Series and per-genre rows, Series/Films filters |
| Player | HTML5 playback with seek (HTTP range requests), resume where you left off, progress saved every 10 s |
| Personal rows | **Continue Watching** with progress bars, **My List**, **Top Picks for you** |
| Recommendations | Genre-affinity model weighted by how much of each title you watched, with "Because you watched X" |
| Search | Live search by title, synopsis or cast, plus genre filter chips |
| Ops | `/status` page in the app, `/health` + `/ready` + `/metrics` on every service, Grafana dashboard |

## Microservices

| Service | Owns | Key endpoints (through the gateway at `/api`) |
|---|---|---|
| **api-gateway** | Edge security | Verifies the JWT once, strips spoofed `x-user-*` headers, forwards trusted identity, rate-limits (300/min, 20/min on login), `GET /api/status` |
| **auth-service** | `auth_db.users` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| **catalog-service** | `catalog_db.titles` + Redis | `GET /catalog/home`, `GET /catalog/titles?q=&genre=&ids=`, `GET /catalog/titles/:id`, `GET /catalog/genres`, `POST /catalog/titles` (admin) |
| **library-service** | `library_db.watchlist`, `watch_progress` | `GET/PUT/DELETE /library/watchlist/:id`, `GET /library/continue-watching`, `GET/PUT /library/progress/:id` |
| **streaming-service** | Playback sessions | `POST /stream/:id/session` → signed URL; `GET /stream/:id/play?token=` proxies byte ranges from an allow-listed origin |
| **recommendation-service** | Stateless | `GET /recommendations`, `GET /recommendations/similar/:id` |

Design choices worth knowing:

- **Database per service.** Each service creates its own database on first start, so the same
  image works against Compose Postgres, the in-cluster StatefulSet, or AWS RDS.
- **Signed playback URLs.** A `<video>` tag cannot send an `Authorization` header, so the
  streaming service issues a short-lived token scoped to one user and one title, like a CDN
  signed URL. Source URLs never reach the browser, and only allow-listed origins can be fetched,
  which prevents server-side request forgery (SSRF).
- **Graceful degradation.** If library-service is down, the home page still loads and
  recommendations fall back to popularity. If Redis is down, the catalog reads from Postgres.
- **Share-nothing code.** Each service has its own copy of the logging and metrics helpers
  (`src/lib/`), so it builds and deploys independently. Edit `services/_shared/` and run
  `scripts/sync-shared.sh`.

The demo catalog has 18 fictional titles. Every video is an **openly licensed sample clip**:
Blender Foundation open movies, W3C/MDN test media, test-videos.co.uk and Video.js samples.
Title artwork is generated from each title's colour palette, so no images can break.

## Run it locally (Docker Compose)

```bash
cp .env.example .env        # then put real secrets in it: openssl rand -hex 32
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:8080 | StreamFlix (create an account on the sign-in page) |
| http://localhost:8080/status | Live health of every microservice |
| http://localhost:3000 | Grafana → *StreamFlix — Service Overview* dashboard |
| http://localhost:9090 | Prometheus |

### Develop without Docker

Requires Node 22+, plus Postgres 16 and Redis running locally.

```bash
cd services/auth-service && npm install && npm test     # each service has its own tests
DATABASE_URL=postgres://user:pass@localhost:5432/auth_db JWT_SECRET=dev npm run dev
cd frontend && npm install && npm run dev                # http://localhost:5173, proxies /api to :4000
```

## Deploy to AWS EKS

> **First time deploying?** Start with **[BEGINNER-GUIDE.md](BEGINNER-GUIDE.md)**
> ([PDF](docs/StreamFlix-Beginner-Deployment-Guide.pdf)): 13 numbered steps from creating an AWS
> account to deleting everything, with what you should see and how to fix common errors.
>
> The complete step-by-step runbook — IAM setup, verification, Jenkins wiring, troubleshooting
> and teardown — is in **[DEPLOYMENT.md](DEPLOYMENT.md)**. Below is the short version.

**1. Infrastructure (Terraform)**: VPC across 3 AZs, an EKS cluster with a managed node group
and the EBS CSI driver, 7 ECR repositories, and optionally RDS PostgreSQL.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

**2. Cluster add-ons (once)**: metrics-server for autoscaling, and kube-prometheus-stack for
Prometheus and Grafana.

```bash
scripts/eks-bootstrap.sh us-east-1 streamflix
```

**3. Build, push and deploy.** Let Jenkins do it (next section), or run the same steps by hand.
The script builds `linux/amd64` images, which matters on Apple Silicon Macs, pushes them to ECR,
runs `helm upgrade` with automatic rollback, and smoke-tests the result:

```bash
scripts/deploy.sh us-east-1 streamflix
```

The app URL is the hostname of the `frontend` LoadBalancer service:
`kubectl -n streamflix get svc frontend`.

**Using RDS instead of in-cluster Postgres:** set `create_rds = true` in Terraform, create the
secret yourself, then point the chart at RDS:

```bash
kubectl -n streamflix create secret generic streamflix-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=PLAYBACK_SECRET=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_PASSWORD=$(terraform -chdir=terraform output -raw rds_password)
helm upgrade --install streamflix helm/streamflix ... \
  --set secrets.existingSecret=streamflix-secrets \
  --set postgresql.enabled=false \
  --set externalDatabase.host=$(terraform -chdir=terraform output -raw rds_endpoint) \
  --set database.sslmode=no-verify
```

### What the Helm chart deploys

- A Deployment and Service per microservice, with startup, liveness and readiness probes,
  non-root and read-only containers, zone spreading, and zero-downtime rolling updates.
- HorizontalPodAutoscalers for gateway, catalog, streaming and frontend, plus PodDisruptionBudgets.
- PostgreSQL StatefulSet on encrypted gp3 EBS, and a Redis LRU cache.
- An auto-generated Secret, preserved across upgrades with Helm's `lookup`.
- A ServiceMonitor and Grafana dashboard ConfigMap, picked up by kube-prometheus-stack.
- Optional Ingress, and an optional NetworkPolicy so the data tier only accepts application pods.

## CI/CD (GitHub Actions) — the default

Every push to `main` deploys automatically from GitHub; nothing is built on a laptop.
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on GitHub's servers:

```
test ×6 services ─┐
build frontend ───┼─► build & push 7 images (linux/amd64, tag = commit SHA) ─► helm upgrade ─► smoke test
helm lint ────────┘        (in parallel, cached)                       (auto-rollback)
```

- **No AWS keys in GitHub.** Each run gets temporary AWS credentials through OpenID Connect.
  Only this repository's `main` branch can assume the deploy role (`terraform/github-actions.tf`).
- **Pull requests** run the tests and lint only; they never deploy. Documentation-only pushes
  (Markdown and `docs/`) don't trigger a deploy.
- The run summary shows the commit, the app URL and a friendly `sslip.io` address.
- **Setup (once):** `terraform apply`, then set the repository variables `AWS_ROLE_ARN`
  (`terraform output github_deploy_role_arn`), `AWS_REGION` and `EKS_CLUSTER`.
- `scripts/deploy.sh` still works as a manual fallback. It refuses unpushed code, so EKS
  always matches GitHub either way.

## CI/CD (Jenkins) — alternative

`Jenkinsfile` stages: **validate → unit tests (7 in parallel, inside `node:22-alpine`) → helm lint
→ build and push 7 images tagged with the git SHA → `helm upgrade --atomic` (automatic rollback)
→ in-cluster smoke test of `/api/status`**.

Jenkins setup:

1. The agent needs `docker`, `aws` CLI v2, `kubectl` and `helm`.
2. Add a *Username with password* credential `aws-credentials` (access key / secret key), or leave
   `AWS_CREDENTIALS_ID` empty to use the agent's IAM role.
3. Give that IAM principal cluster access: set `ci_principal_arn` in `terraform.tfvars`.
4. Set `AWS_ACCOUNT_ID` when you run the job. `APP_DIR` defaults to `.` (the repository root);
   change it only if you move the project into a subfolder of another repository.

## Observability

Every service exposes Prometheus metrics: request rate, latency histograms and status codes per
route, plus business metrics such as `stream_starts_total`, `stream_bytes_total`,
`stream_active_connections`, `catalog_cache_lookups_total{result}`, `auth_events_total{event}` and
`recommendations_served_total{strategy}`. Logs are structured JSON (pino) with the service name
on every line. The bundled dashboard shows golden signals per service, playback activity, cache
hit ratio, auth events, memory and event-loop lag.

## Project layout

```
streamflix/
├── frontend/                React SPA + nginx (tier 1)
├── services/                Node.js microservices (tier 2)
│   ├── _shared/             helpers copied into each service by scripts/sync-shared.sh
│   ├── api-gateway/
│   ├── auth-service/
│   ├── catalog-service/
│   ├── library-service/
│   ├── streaming-service/
│   └── recommendation-service/
├── docker-compose.yml       full stack incl. Postgres, Redis, Prometheus, Grafana
├── monitoring/              Prometheus config, Grafana provisioning + dashboard
├── helm/streamflix/         Kubernetes chart (values.yaml, values-eks.yaml)
├── terraform/               AWS VPC, EKS, ECR, optional RDS
├── scripts/                 deploy.sh, eks-bootstrap.sh, sync-shared.sh
├── BEGINNER-GUIDE.md        step-by-step guide for first-time deployers
├── DEPLOYMENT.md            end-to-end EKS runbook (engineer level)
├── docs/                    PDF versions of both guides
└── Jenkinsfile
```
