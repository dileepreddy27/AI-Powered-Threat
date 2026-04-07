# Threat Shield: AI-Powered Threat Detection System

Threat Shield ingests logs/web traffic, performs anomaly detection in near real-time, stores detections, and visualizes alerts/timeline/model performance on a dashboard.

## Stack

- ML API: `FastAPI` + `scikit-learn` + `PyTorch`
- Gateway: `Node.js` + `Express`
- Dashboard: `Next.js`
- Database: `Postgres` (works with local Postgres or Supabase)

## Project Layout

```text
.
|-- apps/
|   `-- dashboard/
|-- services/
|   |-- gateway/
|   `-- ml-api/
|-- infra/
|   `-- sql/init.sql
|-- samples/
|   `-- sample_logs.csv
|-- docker-compose.yml
`-- README.md
```

## What Is Implemented

- CSV/JSON log ingestion
- Feature engineering from logs (IP/method/path/status/request-rate)
- Models:
  - Isolation Forest
  - One-Class SVM
  - PyTorch Autoencoder
- Threat score + attack type classification
- Alerts (high/critical anomalies)
- Timeline and model comparison APIs
- Next.js dashboard for upload and monitoring

## What This Project Actually Does (End-to-End)

When you run this system, it performs the full detection pipeline below:

1. You send logs using:
   - `POST /api/upload` with a CSV file, or
   - `POST /api/ingest` with JSON events.
2. The Gateway service normalizes each log record.
3. The Gateway forwards records to the ML API for anomaly scoring.
4. The ML API converts logs into numerical features (time, IP traits, path patterns, status codes, request-rate behavior).
5. The ML API runs anomaly detection models:
   - Isolation Forest
   - One-Class SVM
   - PyTorch Autoencoder
6. The ML API returns model scores, anomaly decision, threat score, attack-type label, and reason.
7. The Gateway stores:
   - raw log events in `raw_logs`
   - detection outputs in `detections`
   - high/critical incidents in `alerts`
8. The dashboard reads API data and shows:
   - latest detections (threat feed)
   - generated alerts
   - timeline trend (events vs anomalies)
   - model comparison summary
9. You can acknowledge alerts using `POST /api/alerts/:id/ack`.

## Current Scope vs Future Scope

### Current scope (already working)

- Batch/near real-time log analysis via API upload
- Threat scoring and attack categorization for suspicious requests
- Persistent storage of detections and alerts
- Visualization for monitoring and model comparison

### Future scope (not implemented yet)

- Kafka streaming ingestion
- True online learning updates
- Reinforcement-learning response actions (`allow/challenge/block/rate-limit`)
- External incident integrations (Slack, PagerDuty, Jira)

## Prerequisites

- Docker Desktop installed and running
- Git (optional)
- Supabase project (optional, if you want cloud DB instead of local Postgres container)

Verify Docker:

```powershell
docker --version
docker compose version
```

## Environment Setup

From project root:

```powershell
cd "C:\Users\dilee\OneDrive\Documents\New project"
Copy-Item .env.example .env
```

Choose one DB mode in `.env`.

### Option A: Local Docker Postgres (recommended for quick local demo)

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/threat_shield
```

### Option B: Supabase Pooler (recommended for cloud DB)

Use your pooler host/credentials from Supabase `Settings -> Database -> Connection string`.

```env
DATABASE_URL=postgresql://postgres.<project_ref>:<URL_ENCODED_PASSWORD>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Notes:
- Do not use your project HTTPS URL (`https://...supabase.co`) as `DATABASE_URL`.
- URL-encode special password characters (example: `@` becomes `%40`).
- Keep no trailing spaces on the `DATABASE_URL` line.

## Start Services (Docker)

```powershell
docker compose down
docker compose up --build -d
docker compose ps
```

## Health Checks

PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:4000/health
```

CMD:

```cmd
curl http://localhost:8000/health
curl http://localhost:4000/health
```

## Schema Setup

### Local Postgres container

No manual action needed. Schema auto-loads from `infra/sql/init.sql`.

### Supabase

Run schema once in Supabase SQL Editor:

1. Open `SQL Editor`
2. Click `New query`
3. Paste contents of `infra/sql/init.sql`
4. Click `Run`

Expected tables:
- `raw_logs`
- `detections`
- `alerts`
- `model_metrics`

## Upload Sample Logs

PowerShell:

```powershell
curl.exe -X POST http://localhost:4000/api/upload `
  -F "file=@samples/sample_logs.csv" `
  -F "modelName=isolation_forest"
```

CMD (single line):

```cmd
curl -X POST http://localhost:4000/api/upload -F "file=@samples/sample_logs.csv" -F "modelName=isolation_forest"
```

## Validate Output

```powershell
Invoke-RestMethod http://localhost:4000/api/events
Invoke-RestMethod http://localhost:4000/api/alerts
Invoke-RestMethod http://localhost:4000/api/timeline
Invoke-RestMethod http://localhost:4000/api/model-comparison
```

## Open Dashboard

- [http://localhost:3000](http://localhost:3000)

Check from terminal:

PowerShell:

```powershell
(Invoke-WebRequest http://localhost:3000).StatusCode
```

CMD:

```cmd
curl -I http://localhost:3000
```

## Common Errors and Fixes

### `docker` is not recognized

Install Docker Desktop, restart terminal, and verify:

```powershell
docker --version
```

### `{"message":"file is required"}` on upload

You sent `POST /api/upload` without `-F "file=@..."`.

### `-F is not recognized`

You ran `-F ...` as a separate command line. Keep all `curl` parts in one command.

### `getaddrinfo ENOTFOUND db.<...>.supabase.co`

Gateway cannot resolve/reach that DB host.

Fix:
- Prefer Supabase pooler URL in `DATABASE_URL`, or
- Temporarily switch to local DB:
  `postgresql://postgres:postgres@postgres:5432/threat_shield`

### `curl: (7) Failed to connect to localhost:3000`

Dashboard is not reachable.

Check:

```powershell
docker compose ps
docker compose logs dashboard --tail=120
docker compose down
docker compose up --build -d
```

### `.StatusCode was unexpected at this time`

You ran PowerShell syntax in CMD.

Use:

```cmd
powershell -Command "(Invoke-WebRequest http://localhost:3000).StatusCode"
```

### `{"detail":"Not Found"}` on health

You likely called `/healthcls` instead of `/health`.

Correct endpoint:
- `http://localhost:8000/health`

## Stop or Reset

Stop containers:

```powershell
docker compose down
```

Stop and remove volumes (fresh DB):

```powershell
docker compose down -v
```

## API Endpoints

Gateway (`http://localhost:4000`):
- `GET /health`
- `GET /api/models`
- `POST /api/train`
- `POST /api/ingest`
- `POST /api/upload` (multipart file field: `file`)
- `GET /api/events`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`
- `GET /api/timeline`
- `GET /api/model-comparison`

ML API (`http://localhost:8000`):
- `GET /health`
- `GET /models`
- `POST /train`
- `POST /detect`

## Security Note

If any DB password was shared in terminal/chat history, rotate it immediately in Supabase and update `.env`.
