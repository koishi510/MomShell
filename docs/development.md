# Development Guide

## Prerequisites

- Go 1.23+
- Node.js 24+
- PostgreSQL
- Git
- pre-commit (optional, for git hooks)

See [Getting Started](getting-started.md) for installation links.

## Setup

### Automated (Recommended)

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh
```

### Manual

```bash
cp .env.example .env   # Edit with your config

cd backend && go mod download && cd ..
cd frontend && npm install && cd ..

# Optional: install git hooks
pre-commit install
```

## Running Locally

### Using Make

```bash
make dev-backend    # Terminal 1 — Go server on :8000
make dev-frontend   # Terminal 2 — Vite dev server on :3000
make dev-tmux       # Or both in tmux
```

### Manual Commands

```bash
# Backend
cd backend && go run cmd/server/main.go

# Frontend
cd frontend && npx vite
```

## Common Commands

```bash
make lint          # go vet + eslint
make format        # go fmt
make typecheck     # go build + vue-tsc
make check         # lint + typecheck

make build-backend   # Build Go binary
make build-frontend  # Vite production build
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for code standards, commit conventions, and PR workflow.

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
