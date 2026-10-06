# NoteOrbit FastAPI Microservices Backend

Production stack: **FastAPI**, **PostgreSQL**, **PgBouncer**, **Redis**, **Celery**, **MinIO**, **Nginx**, **Gunicorn**.

## Services

| Service | Routes |
|---------|--------|
| auth-api | `/auth/*`, `/login`, `/register`, `/me` |
| admin-api | `/admin/*` |
| academics-api | Notes, notices, library, faculty tools |
| campus-api | Hostel, fees, demo checkout |
| attendance-api | `/attendance/*` |
| comms-api | Parent/faculty messaging |
| ai-api | `/chat`, `/ai/*`, `/api/academic-insights` |
| storage-api | `/objects/*` |

HRD/placement endpoints were **removed** (not ported).

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

Use **`-d`** (detached). `docker compose up` without `-d` streams logs in the foreground and will look "stuck" even when everything is healthy.

API gateway: `http://localhost` (Nginx port 80)  
Frontend (Docker): `http://localhost:8080`

Startup order: Postgres → PgBouncer → `db-init` (one-shot) → API services → Nginx → Frontend.  
A pause on `pgbouncer Waiting` or `db-init` for ~10–30s on first run is normal.

## Build images only

```bash
# Backend API image (shared by all microservices)
docker build -t noteorbit-backend:latest .

# Frontend static site + nginx
docker build -t noteorbit-frontend:latest --build-arg VITE_API_URL=http://localhost ../frontend

# Or build both via compose
docker compose build
docker compose build frontend
```

## Migrate legacy SQLite

```bash
# With Postgres running (docker compose up postgres pgbouncer -d)
python scripts/migrate_sqlite_to_postgres.py
```

Backs up `../backend/noteorbit.db` to `noteorbit.db.bak` before copying rows.

## Groq AI + SMTP (server `.env`, not in portal UI)

All secrets live in `backend/.env` only. Copy the template:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Orbit Bot chat, academic insights, routine OCR |
| `GROQ_MODEL` | Default `llama-3.3-70b-versatile` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Parent/faculty notification emails |

**Groq:** create a key at [console.groq.com/keys](https://console.groq.com/keys) → paste into `GROQ_API_KEY`.

**Gmail SMTP:** turn on 2FA → [App Passwords](https://myaccount.google.com/apppasswords) → set `SMTP_PASS` (not your normal Gmail password).

After editing `.env`, reload services:

```bash
docker compose up -d --force-recreate ai-api auth-api admin-api comms-api celery-worker
```

Verify (optional, from `backend/` with keys in `.env`):

```bash
python scripts/verify_integrations.py
```

## Development

```bash
pip install -r requirements.txt
# Host → PgBouncer mapped port; containers use pgbouncer:5432 (set in docker-compose)
export DATABASE_URL=postgresql+psycopg2://noteorbit:noteorbit123@localhost:6432/noteorbit
python scripts/bootstrap_db.py
uvicorn services.auth_service.main:app --reload --port 8001
```
