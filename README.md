# Threat Shield: AI-Powered Threat Detection System

Threat Shield ingests logs or web traffic, runs anomaly detection in near real-time, generates threat scores, and exposes alerts/timeline/model-comparison for a security dashboard.

## Stack

- ML service: `FastAPI` + `scikit-learn` + `PyTorch`
- Gateway: `Node.js` + `Express`
- Dashboard: `Next.js`
- Database: `Postgres` (Supabase-compatible schema)
- Optional future stream layer: Kafka

## Monorepo Layout

```text
.
├─ apps/
│  └─ dashboard/              # Next.js frontend
├─ services/
│  ├─ gateway/                # Node.js API gateway + persistence
│  └─ ml-api/                 # FastAPI + anomaly detection models
├─ infra/
│  └─ sql/init.sql            # Database schema bootstrap
├─ samples/sample_logs.csv    # Demo input data
├─ docker-compose.yml
└─ README.md
```

## Features Implemented

- CSV or JSON log ingestion
- Feature engineering from logs (`IP`, method, path patterns, status code, request rate)
- Baseline anomaly models:
  - Isolation Forest
  - One-Class SVM
- Deep anomaly model:
  - PyTorch Autoencoder
- Threat scoring and attack type classification
- Alerting (high/critical severity anomalies)
- Timeline endpoint (hourly anomaly trend)
- Model comparison endpoint
- Dashboard for upload + monitoring

## Quick Start (Docker)

1. Copy env template:
   ```bash
   cp .env.example .env
   ```
   `NEXT_PUBLIC_GATEWAY_URL` is browser-facing, while `GATEWAY_INTERNAL_URL` is used by Next.js server-side rendering.
2. Start all services:
   ```bash
   docker compose up --build
   ```
3. Open apps:
   - Dashboard: `http://localhost:3000`
   - Gateway health: `http://localhost:4000/health`
   - ML API health: `http://localhost:8000/health`

## Local Dev (without Docker)

### 1) ML API

```bash
cd services/ml-api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Gateway

```bash
cd services/gateway
npm install
npm run dev
```

### 3) Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

### 4) Postgres

Use local Postgres (or Supabase) and execute:

```sql
\i infra/sql/init.sql
```

## API Overview

### Gateway (`http://localhost:4000`)

- `GET /health`
- `POST /api/ingest`
  - Body:
    ```json
    {
      "modelName": "isolation_forest",
      "events": [
        {
          "event_time": "2026-04-06T10:00:00Z",
          "source_ip": "45.134.22.8",
          "destination_ip": "10.0.0.11",
          "method": "GET",
          "path": "/wp-admin.php",
          "status_code": 404,
          "bytes_sent": 288,
          "user_agent": "curl/7.64.1"
        }
      ]
    }
    ```
- `POST /api/upload` (multipart file field: `file`)
- `GET /api/events`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`
- `GET /api/timeline`
- `GET /api/model-comparison`

### ML API (`http://localhost:8000`)

- `GET /health`
- `GET /models`
- `POST /train`
- `POST /detect`

## Demo Run

Upload `samples/sample_logs.csv` from the dashboard or use:

```bash
curl -X POST http://localhost:4000/api/upload \
  -F "file=@samples/sample_logs.csv" \
  -F "modelName=isolation_forest"
```

## Next Enhancements (Research-grade)

- Kafka ingestion and stream consumers
- Online learning updates from recent benign traffic
- RL response policy (`allow`, `challenge`, `block`, `rate-limit`)
- SOC workflow integrations (Slack, PagerDuty, Jira)
- MITRE ATT&CK mapping per detected technique
