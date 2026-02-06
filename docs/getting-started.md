# Getting Started

Get MomShell up and running in minutes.

## Prerequisites

Before you begin, ensure you have:

- [uv](https://docs.astral.sh/uv/) - Python package manager
- [nvm](https://github.com/nvm-sh/nvm) - Node.js version manager

### Install uv

```bash
# Linux / macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Install nvm

```bash
# Linux / macOS
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Windows: use nvm-windows
# https://github.com/coreybutler/nvm-windows
```

## Quick Install

```bash
# Clone the repository
git clone https://github.com/koishi510/MomShell.git
cd MomShell

# Run the setup script (recommended)
./scripts/dev-setup.sh
```

The setup script automatically:
- Checks prerequisites
- Creates `.env` from template
- Installs backend/frontend dependencies
- Sets up Git hooks

## Start the Application

```bash
# Using Make (recommended) - run in separate terminals
make dev-backend   # Terminal 1
make dev-frontend  # Terminal 2

# Or use tmux to start both
make dev-tmux
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Create Admin Account

To manage certifications and other admin tasks:

```bash
cd backend
uv run python -m scripts.create_admin <username> <email> <password> [nickname]

# Example
uv run python -m scripts.create_admin admin admin@example.com mypassword Admin
```

## Next Steps

- [Configure environment variables](configuration.md)
- [Explore features](features.md)
- [Deploy with Docker](deployment.md)

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
