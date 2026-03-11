# Docker Deployment

## Prerequisites

```bash
# Arch Linux
sudo pacman -S docker docker-compose

# Ubuntu/Debian
sudo apt install docker.io docker-compose

sudo systemctl start docker
sudo systemctl enable docker
```

## Quick Start (Docker Compose)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: uncomment the Docker DATABASE_URL line (postgres host)
# Set JWT_SECRET_KEY, OPENAI_API_KEY, etc.

# 2. Start all services
make docker-up

# 3. Access
# App:          http://localhost
# Admin panel:  http://localhost/admin
```

## Architecture

A single Docker image contains both frontend and backend:

```
Browser → Nginx (:80)
            ├── /            → static files (Vue SPA)
            ├── /api/        → proxy → Go backend (:8000)
            ├── /uploads/    → proxy → Go backend (:8000)
            └── /admin       → proxy → Go backend (:8000)
```

`docker-compose.yml` (in `deploy/`) runs two containers:

| Service | Image | Port |
|---------|-------|------|
| **app** | Nginx + Go binary (single image) | 80 (exposed) |
| **postgres** | PostgreSQL 16 | 5432 (internal) |

The root `Dockerfile` uses multi-stage builds:
1. **frontend-builder** — Node 24, `npm ci && npm run build` → `dist/`
2. **backend-builder** — Go 1.25, `go build` → binary
3. **final** — Nginx Alpine + Go binary + entrypoint script

## ModelScope Standalone Deployment

For single-container platforms like ModelScope Studios, the Dockerfile also supports embedded PostgreSQL:

```bash
docker build -t momshell .
docker run -d -p 7860:7860 --env-file .env momshell
```

The entrypoint script (`deploy/entrypoint.sh`) auto-initializes PostgreSQL (initdb, create user/db) when no external database is configured. Nginx listens on port 7860 in this mode.

## Make Commands

```bash
make docker-build    # Build Docker image
make docker-up       # Start all services (app + postgres)
make docker-down     # Stop all services
make docker-logs     # View logs
```

## Configuration

Key environment variables for deployment:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `postgres://momshell:momshell@postgres:5432/momshell?sslmode=disable` |
| `POSTGRES_USER` | PostgreSQL container user (default: momshell) |
| `POSTGRES_PASSWORD` | PostgreSQL container password (default: momshell) |
| `POSTGRES_DB` | PostgreSQL container database (default: momshell) |
| `JWT_SECRET_KEY` | Secure random secret |
| `OPENAI_API_KEY` | LLM API key |
| `PORT` | Backend server port (default: 8000, internal) |

`VITE_API_BASE_URL` is not needed in Docker — Nginx proxies `/api/` to the backend within the same container.

See [Configuration](configuration.md) for the full reference.

## Data Persistence

PostgreSQL data is stored in a Docker named volume `pgdata`. To reset:

```bash
make docker-down
docker volume rm deploy_pgdata
make docker-up
```

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
