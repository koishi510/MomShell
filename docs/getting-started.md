# Getting Started

## Prerequisites

- [Go 1.25+](https://go.dev/dl/)
- [Node.js 24+](https://nodejs.org/) (or via [nvm](https://github.com/nvm-sh/nvm))
- [PostgreSQL](https://www.postgresql.org/)
- Git

## Quick Install

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh
```

The setup script:
- Checks prerequisites (Go, Node, npm, git)
- Creates `.env` from template with auto-generated JWT secret
- Downloads Go dependencies
- Installs npm packages
- Installs pre-commit hooks

## Start the Application

```bash
make dev-backend    # Terminal 1 — http://localhost:8000
make dev-frontend   # Terminal 2 — http://localhost:5173

# Or use tmux
make dev-tmux
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Admin Panel | http://localhost:8000/admin |

## Create Admin Account

Set these in `.env` before first startup:

```
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

Or create additional admins via the admin panel after login.

## Next Steps

- [Configure environment variables](configuration.md)
- [Explore features](features.md)
- [Deploy with Docker](deployment.md)

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
