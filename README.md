# MomShell

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-4285F4?logo=google&logoColor=white)](https://mediapipe.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Ruff](https://img.shields.io/badge/Ruff-D7FF64?logo=ruff&logoColor=black)](https://docs.astral.sh/ruff/)
[![mypy](https://img.shields.io/badge/mypy-1674B1?logo=python&logoColor=white)](https://mypy-lang.org/)
[![Qwen](https://img.shields.io/badge/Qwen-6F42C1?logo=alibabacloud&logoColor=white)](https://www.alibabacloud.com/solutions/generative-ai/qwen)
[![Firecrawl](https://img.shields.io/badge/Firecrawl-FF6B35?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iTTEzLjUuNjdzLjc0IDIuNjUuNzQgNC44YzAgMi4wNi0xLjM1IDMuNzMtMy40MSAzLjczLTIuMDcgMC0zLjYzLTEuNjctMy42My0zLjczbC4wMy0uMzZDNS4yMSA3LjUxIDQgMTAuNjIgNCAxNGMwIDQuNDIgMy41OCA4IDggOHM4LTMuNTggOC04QzIwIDguNjEgMTcuNDEgMy44IDEzLjUuNjd6TTExLjcxIDE5Yy0xLjc4IDAtMy4yMi0xLjQtMy4yMi0zLjE0IDAtMS42MiAxLjA1LTIuNzYgMi44MS0zLjEyIDEuNzctLjM2IDMuNi0xLjIxIDQuNjItMi41OC4zOSAxLjI5LjU5IDIuNjUuNTkgNC4wNCAwIDIuNjUtMi4xNSA0LjgtNC44IDQuOHoiLz48L3N2Zz4K&logoColor=white)](https://www.firecrawl.dev/)
[![Edge TTS](https://img.shields.io/badge/Edge%20TTS-0078D4?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iTTIxLjg2IDE3Ljg2cS4xNCAwIC4yNS4xMi4xLjEzLjEuMjV0LS4xMS4zM2wtLjMyLjQ2LS40My41My0uNDQuNXEtLjIxLjI1LS4zOC40MmwtLjIyLjIzcS0uNTguNTMtMS4zNCAxLjA0LS43Ni41MS0xLjYuOTEtLjg2LjQtMS43NC42NHQtMS42Ny4yNHEtLjkgMC0xLjY5LS4yOC0uOC0uMjgtMS40OC0uNzgtLjY4LS41LTEuMjItMS4xNy0uNTMtLjY2LS45Mi0xLjQ0LS4zOC0uNzctLjU4LTEuNi0uMi0uODMtLjItMS42NyAwLTEgLjMyLTEuOTYuMzMtLjk3Ljg3LTEuOC4xNC45NS41NSAxLjc3LjQxLjgxIDEuMDIgMS40OS42LjY4IDEuMzggMS4yMS43OC41NCAxLjY0LjkuODYuMzYgMS43Ny41Ni45Mi4yIDEuOC4yIDEuMTIgMCAyLjE4LS4yNCAxLjA2LS4yMyAyLjA2LS43MmwuMi0uMS4yLS4wNXptLTE1LjUtMS4yN3EwIDEuMS4yNyAyLjE1LjI3IDEuMDYuNzggMi4wMy41MS45NiAxLjI0IDEuNzcuNzQuODIgMS42NiAxLjQtMS40Ny0uMi0yLjgtLjc0LTEuMzMtLjU1LTIuNDgtMS4zNy0xLjE1LS44My0yLjA4LTEuOS0uOTItMS4wNy0xLjU4LTIuMzNULjM2IDE0Ljk0UTAgMTMuNTQgMCAxMi4wNnEwLS44MS4zMi0xLjQ5LjMxLS42OC44My0xLjIzLjUzLS41NSAxLjItLjk2LjY2LS40IDEuMzUtLjY2LjY4LS4yNyAxLjM1LS4zOC42Ni0uMTIgMS4yLS4xMi43MyAwIDEuNDQuMTYuNy4xNyAxLjM0LjUuNjQuMzIgMS4xNy43OS41Mi40OC44OCAxLjA4LTIuMDkuMzUtMy41NiAxLjc3LTEuNDYgMS40My0xLjg2IDMuMzUtLjA0LjItLjA2LjQyLS4wMi4yLS4wNC40NHptOC4zNi05LjM5cTAtLjkzLjM1LTEuNzMuMzUtLjguOTYtMS40LjYtLjYyIDEuNDItLjk3LjgtLjM1IDEuNzQtLjM1IDEuMzcgMCAyLjYuNiAxLjI0LjYgMi4yMiAxLjU2IDEgLjk2IDEuNzggMi4xOC43OSAxLjIgMS4zMSAyLjUuNTIgMS4yOC44IDIuNTYuMjggMS4yNy4yOCAyLjMxIDAgLjY3LS4wOSAxLjM0LS4wOC42OC0uMjUgMS4zMy0uNDMtLjc0LTEuMS0xLjM2LS42Ni0uNjItMS40Ny0xLjA5LS44LS40Ny0xLjcxLS43OS0uOS0uMzEtMS44NC0uNDktLjk0LS4xNy0xLjg3LS4xN2gtLjU2cS0uNy0uNjktMS4xOC0xLjU2LS40Ny0uODctLjcyLTEuODItLjI1LS45NS0uMjUtMS45LS4wMS0uNzYuMTMtMS40OC4xMy0uNzEuMzUtMS4yNC0uNTcuMi0uOTguNjItLjQuNC0uNTUuOTktLjAzLjE0LS4wNC4yOHYuMjlxMCAuNC4xLjc3LjEuMzcuMjYuNzNsLjIxLjQ1LS43Ny4yNXEtLjcuMjQtMS4yOC42Ni0uNTguNDMtMS4wMi45OS0uNDMuNTYtLjY4IDEuMjMtLjI2LjY2LS4yNiAxLjR2LjVsLS40NC0uMTdxLS41OS0uMjItMS4xMS0uNTYtLjUyLS4zNS0uOTMtLjgtLjQtLjQ3LS42OC0xLjAzLS4yNy0uNTUtLjM4LTEuMTYtLjEtLjYtLjA1LTEuMjQuMDQtLjYzLjI3LTEuMjUuMjItLjYyLjYzLTEuMi40LS41Ny45Ni0xLjA0LjU2LS40NyAxLjI4LS44LjcxLS4zNCAxLjU3LS40Ny0uMy0uNDMtLjMtMXoiLz48L3N2Zz4K&logoColor=white)](https://github.com/rany2/edge-tts)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

A warm, AI-powered companion for postpartum recovery — offering emotional support, exercise coaching, and a caring community for new mothers.

## Features

- **Soul Companion**: Emotional support chat companion powered by ModelScope Qwen
  - Warm, validating, non-judgmental conversation style
  - Designed specifically for postpartum emotional support
  - Visual ambient effects with healing UI design
  - Conversation memory for personalized interactions
  - Web search integration (Firecrawl) for factual/medical questions to reduce hallucinations
- **Sisterhood Bond**: Mutual support community for postpartum mothers
  - Dual-channel system: Professional Channel (doctors' advice) & Experience Channel (moms' stories)
  - Verified healthcare professionals: doctors, therapists, nurses
  - Q&A with likes, collections, and content moderation
  - Daily Resonance topics and Shell Picks (collections)
- **Recovery Coach**: AI-powered postpartum exercise coaching with real-time pose detection
  - Real-time pose detection with MediaPipe (33 body landmarks)
  - 9 postpartum-specific exercises across 5 categories (breathing, pelvic floor, diastasis recti, posture, strength)
  - LLM-powered voice feedback with Edge TTS in gentle, encouraging tone
  - Progress tracking with achievements, streaks, and strength metrics
  - Safety monitoring with fatigue detection and automatic rest prompts
- **Guardian Partner**: Gamified system to engage partners in postpartum recovery
  - Partner binding via invite codes
  - Daily status recording (mood, energy, health conditions, feeding, sleep)
  - Smart suggestions pushed to partner based on mom's status
  - Task system with 3 difficulty levels and point rewards
  - Level progression: Intern → Trainee → Regular → Gold
  - Time recorder for baby milestone photos

## Tech Stack

### Backend

- **FastAPI** - High-performance async web framework
- **MediaPipe** - Real-time pose detection (33 landmarks, LITE model by default)
- **LangGraph** - Workflow orchestration for coaching logic
- **Edge TTS** - Microsoft neural voice synthesis
- **SQLite + SQLAlchemy** - Lightweight database

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

## Project Structure

```
MomShell/
├── backend/                    # FastAPI backend
│   ├── app/                    # Application code
│   │   ├── api/v1/             # API v1 routes (REST + WebSocket)
│   │   ├── core/               # Configuration and database
│   │   ├── models/             # ML models dir (MediaPipe, gitignored)
│   │   ├── schemas/            # Pydantic schemas (coach)
│   │   ├── services/           # Business logic
│   │   │   ├── auth/           # Authentication service (JWT, OAuth)
│   │   │   ├── chat/           # Soulful Companion service
│   │   │   ├── coach/          # Recovery Coach service
│   │   │   │   ├── analysis/   # Pose analysis & scoring
│   │   │   │   ├── exercises/  # Exercise library
│   │   │   │   ├── feedback/   # LLM feedback & TTS
│   │   │   │   ├── pose/       # MediaPipe pose detection
│   │   │   │   ├── progress/   # Progress tracking
│   │   │   │   └── workflow/   # LangGraph workflow
│   │   │   ├── community/      # Community service
│   │   │   │   ├── moderation/ # Content moderation
│   │   │   │   ├── router/     # Community API routes
│   │   │   │   └── schemas/    # Community schemas
│   │   │   ├── guardian/       # Guardian Partner service
│   │   │   └── web_search.py   # Firecrawl web search service
│   │   ├── static/             # Static assets (CSS, JS)
│   │   ├── templates/          # HTML templates
│   │   └── tts_cache/          # TTS audio cache (gitignored)
│   ├── data/                   # Database storage (gitignored)
│   ├── models/                 # ML models (MediaPipe, gitignored)
│   ├── scripts/                # CLI scripts (create_admin, etc.)
│   ├── tests/                  # Backend tests
│   ├── Dockerfile              # Backend container
│   ├── pyproject.toml          # Python dependencies
│   └── requirements.txt        # Pip requirements
│
├── frontend/                   # Next.js frontend
│   ├── app/                    # App router pages
│   │   ├── auth/               # Auth pages (login, register, etc.)
│   │   ├── chat/               # Soulful Companion page
│   │   ├── coach/              # Recovery Coach page
│   │   ├── community/          # Community pages
│   │   │   ├── admin/          # Admin pages (certification review)
│   │   │   ├── certification/  # Professional certification
│   │   │   ├── collections/    # Shell Picks collections
│   │   │   ├── my-posts/       # My questions
│   │   │   ├── my-replies/     # My answers
│   │   │   └── profile/        # User profile
│   │   └── guardian/           # Guardian Partner page
│   ├── components/             # React components
│   │   ├── auth/               # Auth components
│   │   ├── coach/              # Recovery Coach components
│   │   ├── community/          # Community components
│   │   ├── guardian/           # Guardian Partner components
│   │   └── home/               # Home page components
│   ├── contexts/               # React contexts (AuthContext)
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilities & API clients
│   │   └── api/                # API client modules
│   ├── public/                 # Public assets
│   ├── types/                  # TypeScript type definitions
│   └── Dockerfile              # Frontend container
│
├── deploy/                     # Deployment configurations
│   ├── docker-compose.yml      # Multi-container setup
│   └── nginx.conf              # Nginx reverse proxy
│
├── Dockerfile                  # Combined container (ModelScope)
├── .env                        # Environment variables
├── Makefile                    # Build commands
└── README.md
```

## Getting Started

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [nvm](https://github.com/nvm-sh/nvm) (Node.js version manager)

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

### Installation

1. Clone the repository

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
```

2. Run the setup script (recommended)

```bash
./scripts/dev-setup.sh
```

This script automatically checks prerequisites, creates `.env`, installs backend/frontend dependencies, and sets up Git hooks. See [Contributing Guide](CONTRIBUTING.md) for details.

<details>
<summary>Or install manually</summary>

1. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

2. Install backend dependencies

```bash
cd backend
uv sync
cd ..
```

3. Install frontend dependencies

```bash
cd frontend
nvm install
nvm use
npm install
cd ..
```

</details>

### Running the Application

You need to run both the backend and frontend servers.

#### Using Make (Recommended)

```bash
# Start backend and frontend in separate terminals
make dev-backend   # Terminal 1
make dev-frontend  # Terminal 2

# Or use tmux to start both
make dev-tmux
```

#### Manual Commands

**Terminal 1 - Backend (FastAPI)**

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend (Next.js)**

```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Create Admin Account

To create an admin account for managing certifications and other admin tasks:

```bash
cd backend
uv run python -m scripts.create_admin <username> <email> <password> [nickname]

# Example
uv run python -m scripts.create_admin admin admin@example.com mypassword Admin
```

If the user already exists, it will be promoted to admin. Otherwise, a new admin account will be created.

## Docker Deployment

### Prerequisites

```bash
# Arch Linux
sudo pacman -S docker docker-compose

# Ubuntu/Debian
sudo apt install docker.io docker-compose

# Start Docker daemon
sudo systemctl start docker
```

### Quick Start

```bash
# 1. Configure
cp .env.example .env
# Edit .env, fill in MODELSCOPE_KEY

# 2. Run (multi-container)
cd deploy
docker compose up -d --build

# 3. Access
open http://localhost:7860
```

### Commands

```bash
# From deploy/ directory
docker compose down          # Stop
docker compose up -d --build # Rebuild
docker compose logs -f       # Logs

# Or use Make (from project root)
make docker-up               # Build and start
make docker-down             # Stop
make docker-logs             # View logs
make docker-build-backend    # Build backend image only
make docker-build-frontend   # Build frontend image only
```

### Single Container (ModelScope)

```bash
# Build combined image from project root
docker build -t momshell .
docker run -d -p 7860:7860 --env-file .env momshell

# Or use Make
make docker-build            # Build combined image
```

**Note**: Ensure `PORT` is commented out in `.env` (or not set) so the Dockerfile's `PORT=7860` takes effect.

## Environment Variables

| Variable                  | Description                             | Required | Default                                  |
| ------------------------- | --------------------------------------- | -------- | ---------------------------------------- |
| `MODELSCOPE_KEY`          | ModelScope API key for AI services      | Yes      | -                                        |
| `MODELSCOPE_MODEL`        | Model name for chat and feedback        | No       | `Qwen/Qwen2.5-72B-Instruct`              |
| `DATABASE_URL`            | Database connection URL                 | No       | `sqlite+aiosqlite:///./data/momshell.db` |
| `PORT`                    | Server port (Docker sets 7860)          | No       | `8000` (local) / `7860` (Docker)         |
| `DEBUG`                   | Enable debug mode                       | No       | `false`                                  |
| `MEDIAPIPE_MODEL`         | Pose detection model (`lite` or `full`) | No       | `lite`                                   |
| `MIN_TRACKING_CONFIDENCE` | MediaPipe tracking confidence           | No       | `0.3`                                    |
| `TTS_VOICE`               | Microsoft Edge TTS voice                | No       | `zh-CN-XiaoxiaoNeural`                   |
| `FIRECRAWL_API_KEY`       | Firecrawl API key for web search        | No       | -                                        |

**Important**: Do not use quotes around values in `.env` - Docker `--env-file` includes quotes literally.

See `.env.example` for all available configuration options.

## Architecture Highlights

### Real-time Pose Detection

- Uses MediaPipe Pose Landmarker with VIDEO mode for tracking
- LITE model by default for better performance on low-end servers (configurable via `MEDIAPIPE_MODEL`)
- Client-side skeleton rendering for minimal latency

### Non-blocking Feedback

- LLM feedback generation runs in background
- TTS synthesis is fire-and-forget
- No blocking of the frame processing pipeline

### WebSocket Protocol

- Real-time bidirectional communication
- Client sends video frames, server returns keypoints
- Skeleton drawn on client side for smooth 20+ FPS experience

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development environment setup
- Code standards and quality checks
- Branch management and PR process
- Commit message conventions

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
