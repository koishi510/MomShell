# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
make install              # Install all deps (go mod download + npm install)
make dev-backend          # Go server on :8000 (auto-starts local PostgreSQL via systemctl)
make dev-frontend         # Vite dev server on :5173
make dev-tmux             # Both servers in tmux split panes
make check                # Run all checks (lint + typecheck)
make lint                 # go vet + eslint
make typecheck            # go build + vue-tsc
make build-backend        # Compile Go binary to backend/bin/server
make build-frontend       # vite build
make db-reset             # Drop and recreate PostgreSQL public schema
```

Backend tests: `cd backend && go test ./...`

Frontend type check only: `cd frontend && npx vue-tsc --noEmit -p tsconfig.node.json`

## Architecture

This is a fullstack app: **Go backend** (Gin + GORM + PostgreSQL) serving a **Vue 3 frontend** (Vite + TypeScript + Pinia). The UI is a beach-themed interactive scene with overlay panels.

### Backend Layered Architecture

All backend code follows a strict layered pattern. Each domain (user, chat, echo, community, admin, etc.) has matching files across all layers:

```
handler (HTTP/Gin context) -> service (business logic) -> repository (GORM queries) -> model (DB entity)
```

- `internal/dto/` holds request/response types separate from models
- `internal/router/router.go` is a single file defining all routes
- `cmd/server/main.go` wires all dependencies manually (no DI framework)
- `internal/database/migrate.go` uses GORM AutoMigrate (no SQL migration files)
- `pkg/` contains shared utilities: JWT, password hashing, OpenAI-compatible client

### Frontend Structure

- Single-page app with no router — `App.vue` renders `BeachScene` + overlay panels, visibility controlled by Pinia stores (`auth`, `ui`)
- `components/scene/` — beach scene layers (sky, ocean, sand, sprites, etc.) using CSS animations and composables
- `components/overlay/` — UI panels (`AuthPanel`, `ChatPanel`, `CommunityPanel`, `ProfilePanel`, etc.)
- `lib/auth.ts` — raw `fetch`-based auth calls (register, login, refresh, getMe) with token storage in localStorage/sessionStorage
- `lib/apiClient.ts` — Axios instance with JWT interceptor and automatic token refresh queue; used by `lib/api/*.ts` modules
- `composables/` — animation and interaction hooks (`useParallax`, `useWaveSystem`, `useAnimationLoop`)
- `@` alias maps to `frontend/src/`

### Auth Flow

- JWT-based: access token (30min) + refresh token (7 days)
- Backend extracts user ID from token via `middleware.AuthRequired`/`AuthOptional`/`AdminRequired` and sets `ContextUserID` in Gin context
- Frontend stores tokens in localStorage (remember me) or sessionStorage, with transparent refresh in the Axios interceptor
- Three auth levels: `AuthRequired`, `AuthOptional` (reads token if present), `AdminRequired`

### API Convention

- All endpoints under `/api/v1` with domain groups (`/auth`, `/community`, `/companion`, `/echo`, `/admin`)
- Backend error format: `{"error": "message"}` — frontend `getErrorMessage()` in `apiClient.ts` handles this
- Vite dev proxy forwards `/api` and `/uploads` to `localhost:8000`

## Adding a New Feature

Backend: create `model/<domain>.go`, `dto/<domain>.go`, `repository/<domain>.go`, `service/<domain>.go`, `handler/<domain>.go`, add routes in `router/router.go`, add model to `database/migrate.go` AutoMigrate, wire handler in `cmd/server/main.go`.

Frontend: create `lib/api/<domain>.ts`, `components/overlay/<Name>Panel.vue`, optionally add a Pinia store and types.

## Environment

Config is loaded from `.env` at project root via godotenv (see `.env.example`). Key variables: `DATABASE_URL`, `JWT_SECRET_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `VITE_API_BASE_URL`. The `OPENAI_*` vars point to a ModelScope-hosted Qwen model by default.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on all branches:
- **Frontend**: npm ci, eslint, vue-tsc, vite build
- **Backend**: gofmt check, go vet, golangci-lint, go build, go test
