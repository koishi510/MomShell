# Development Guide

Set up your development environment for contributing to MomShell.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) - Python package manager
- [nvm](https://github.com/nvm-sh/nvm) - Node.js version manager
- Git

See [Getting Started](getting-started.md) for installation instructions.

## Setup

### Automated Setup (Recommended)

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh
```

### Manual Setup

1. **Environment variables**

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

2. **Backend dependencies**

```bash
cd backend
uv sync
cd ..
```

3. **Frontend dependencies**

```bash
cd frontend
nvm install
nvm use
npm install
cd ..
```

## Running Locally

### Using Make

```bash
# Start backend and frontend in separate terminals
make dev-backend   # Terminal 1
make dev-frontend  # Terminal 2

# Or use tmux to start both
make dev-tmux
```

### Manual Commands

**Backend (FastAPI)**

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Next.js)**

```bash
cd frontend
npm run dev
```

## Common Commands

```bash
# Backend
make lint          # Run linters (ruff)
make test          # Run backend tests

# Frontend
cd frontend
npm run lint       # ESLint
npm run build      # Production build
```

## Contributing

Please read the full [Contributing Guide](../CONTRIBUTING.md) for:

- Code standards and quality checks
- Branch management and PR process
- Commit message conventions
- Testing requirements

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
