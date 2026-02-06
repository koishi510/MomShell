# Docker Deployment

Deploy MomShell with Docker for production environments.

## Prerequisites

### Install Docker

```bash
# Arch Linux
sudo pacman -S docker docker-compose

# Ubuntu/Debian
sudo apt install docker.io docker-compose

# Start Docker daemon
sudo systemctl start docker
sudo systemctl enable docker
```

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env, fill in MODELSCOPE_KEY (required)

# 2. Start services
cd deploy
docker compose up -d --build

# 3. Access the application
open http://localhost:7860
```

## Docker Compose Deployment

The recommended deployment method using `deploy/docker-compose.yml`:

```bash
cd deploy

# Start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Make Commands

From the project root:

```bash
make docker-up               # Build and start all containers
make docker-down             # Stop all containers
make docker-logs             # View container logs
make docker-build-backend    # Build backend image only
make docker-build-frontend   # Build frontend image only
```

## Single Container Deployment

For platforms like ModelScope or simpler deployments:

```bash
# Build combined image
docker build -t momshell .

# Run container
docker run -d -p 7860:7860 --env-file .env momshell

# Or use Make
make docker-build
```

**Note**: Ensure `PORT` is commented out in `.env` (or not set) so the Dockerfile's `PORT=7860` takes effect.

## Container Architecture

### Multi-Container (docker-compose)

- **backend**: FastAPI application
- **frontend**: Next.js application
- **nginx**: Reverse proxy

### Single Container

- Combined backend and frontend
- Suitable for platforms with single-container requirements
- Uses port 7860 by default

## Configuration

See [Configuration](configuration.md) for environment variables.

Key variables for Docker:
- `MODELSCOPE_KEY` - Required for AI services
- `PORT` - Container port (default: 7860 for Docker)
- `DATABASE_URL` - Database connection string

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
