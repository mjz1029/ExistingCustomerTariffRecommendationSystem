# AGENTS.md

## Quick Start

```bash
# One-command start (both backend + frontend)
./start.sh

# Or start separately:
./start-backend.sh   # backend on :8000 (auto-creates venv + installs deps)
./start-frontend.sh  # frontend on :5173 (auto-installs node_modules)
```

Backend auto-creates `backend/venv/` and `backend/tariff.db` on first run. No manual setup needed.

## Architecture

```
frontend/  →  React 19 + Vite + Tailwind CSS v4
    ↓ (proxy /api → localhost:8000)
backend/   →  FastAPI + SQLAlchemy + SQLite
    ↓
backend/app/services/engine.py  ← recommendation engine core
backend/app/seed.py             ← default plan catalog (18 plans)
```

- **No router** — `App.tsx` uses lazy-loaded page components with `activePage` state
- **No backend tests, no frontend tests, no linter, no typecheck** — verify manually
- **SQLite DB** auto-seeds 18 plans on first startup (`seed.py`)

## Key Files

| File | What it does |
|------|-------------|
| `backend/app/services/engine.py` | Multi-dimensional scoring engine (the heart of the system) |
| `backend/app/seed.py` | Default plan data — edit here to change catalog |
| `backend/app/models.py` | SQLAlchemy models (Plan, UserRecord, RecommendationResult) |
| `backend/app/config.py` | DB path resolution (dev vs PyInstaller mode) |
| `backend/app/main.py` | FastAPI app, CORS, static file serving |
| `frontend/App.tsx` | Root component, page routing, API calls |
| `frontend/services/api.ts` | All API client functions |
| `frontend/types.ts` | Shared TypeScript interfaces |
| `run.py` | PyInstaller entry point (packaged app launcher) |

## Dev Conventions

- **Language**: Code comments and UI are in Chinese (this is a China Mobile internal tool)
- **API prefix**: All routes under `/api/v1/`
- **Vite proxy**: Dev server proxies `/api` to `http://localhost:8000` (configured in `vite.config.ts`)
- **No CSS files** — Tailwind CSS v4 via Vite plugin, all styles inline
- **Lazy loading**: All page components use `React.lazy()` + `Suspense`
- **Pydantic schemas** use camelCase (matches frontend conventions), SQLAlchemy models use snake_case — `to_dict()` bridges the two

## Build & Release

```bash
# Local build (macOS)
./build.sh    # → backend/dist/套餐推荐系统

# Cross-platform CI: push a tag
git tag v1.0.0 && git push origin v1.0.0
# GitHub Actions builds for Linux/macOS/Windows → Release page
```

## Gotchas

- `tariff.db` is gitignored — each environment gets its own database
- Backend `config.py` switches DB path based on `sys.frozen` (PyInstaller mode vs dev)
- Seed data only inserts if table is empty — deleting `tariff.db` resets to defaults
- `/recommendations/export/download` must be registered before `/{result_id}` in the router (route conflict)
- Frontend uses CDN-loaded SheetJS for client-side Excel parsing; backend uses openpyxl for export
- The `._*` files are macOS resource forks — ignore them
