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

## Backend Deployment

The Go backend has its own Dockerfile (`backend/Dockerfile`):

```bash
# Build
make docker-build-backend
# or: docker build -t momshell-backend backend/

# Run
docker run -d -p 8000:8000 --env-file .env momshell-backend
```

## Make Commands

```bash
make docker-up               # Start all services (docker compose)
make docker-down             # Stop all services
make docker-logs             # View logs
make docker-build-backend    # Build backend image
make docker-build-frontend   # Build frontend image
```

## Configuration

Key environment variables for deployment:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secure random secret |
| `OPENAI_API_KEY` | LLM API key |
| `PORT` | Server port (default: 8000) |
| `VITE_API_BASE_URL` | Leave empty when using Nginx proxy |

See [Configuration](configuration.md) for the full reference.

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
