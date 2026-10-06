# NoteOrbit Frontend (Distributed)

React + Vite + Tailwind micro-frontend layout aligned with the FastAPI backend services.

## Structure

```
src/
  api/              # API client split by domain (auth, admin, academics, campus, …)
  app/App.jsx       # Shell: routing, session, layout
  hooks/            # useCatalogs, useLocalUser
  components/ui/    # Shared UI primitives
  features/
    auth/           # Login, register
    student/        # Student hub modules
    professor/      # Faculty panel
    admin/          # Admin panel
    parent/         # Parent portal
```

## Run

```bash
npm install
npm run dev
```

Set `VITE_API_URL` to your Nginx gateway (default dev proxy targets `http://127.0.0.1`).

## Build

```bash
npm run build
```

Produces code-split chunks: `feature-student`, `feature-admin`, `feature-professor`, `feature-auth`.

## Docker

```bash
docker build -t noteorbit-frontend:latest --build-arg VITE_API_URL=http://localhost .
```

Run with backend stack (from `backend/`): `docker compose up --build` — UI at `http://localhost:8080`, API at `http://localhost`.

Set `VITE_API_URL` to the URL the **browser** uses to reach the API gateway (default `http://localhost`).

## Removed

- HRD / placement UI (matches backend removal)
- Monolithic `src/app.jsx` (replaced by feature modules)
