# MomShell

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

A warm, AI-powered companion for postpartum recovery — offering emotional support, exercise coaching, and a caring community for new mothers.

## Features

- **Soulful Companion**: Emotional support chat companion powered by ModelScope Qwen
  - Warm, validating, non-judgmental conversation style
  - Designed specifically for postpartum emotional support
  - Visual ambient effects with healing UI design
  - Conversation memory for personalized interactions
- **Community**: Mutual support community for postpartum mothers to share experiences and get professional advice
  - Dual-channel system: Professional Channel (doctors' advice) & Experience Channel (moms' stories)
  - Verified healthcare professionals: doctors, therapists, nurses
  - Q&A with likes, collections, and content moderation
  - Daily Resonance topics and Shell Picks (collections)
- **Recovery Coach**: AI-powered postpartum exercise coaching with real-time pose detection and voice feedback
  - Real-time pose detection with MediaPipe (33 body landmarks)
  - 9 postpartum-specific exercises across 5 categories (breathing, pelvic floor, diastasis recti, posture, strength)
  - LLM-powered voice feedback with Edge TTS in gentle, encouraging tone
  - Progress tracking with achievements, streaks, and strength metrics
  - Safety monitoring with fatigue detection and automatic rest prompts

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
├── app/                        # FastAPI backend
│   ├── api/routes/             # API routes (REST + WebSocket)
│   ├── core/                   # Configuration and database
│   ├── models/                 # Database models
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # Business logic
│   │   ├── chat/               # Soulful Companion service
│   │   ├── community/          # Community service
│   │   │   ├── moderation/     # Content moderation
│   │   │   ├── router/         # Community API routes
│   │   │   └── schemas/        # Community schemas
│   │   └── coach/              # Recovery Coach service
│   │       ├── pose/           # MediaPipe pose detection
│   │       ├── exercises/      # Exercise library
│   │       ├── analysis/       # Pose analysis & scoring
│   │       ├── feedback/       # LLM feedback & TTS
│   │       ├── progress/       # Progress tracking
│   │       └── workflow/       # LangGraph workflow
│   ├── static/                 # Static assets (CSS, JS)
│   └── templates/              # HTML templates
└── frontend/                   # Next.js frontend
    ├── app/                    # App router pages
    │   ├── chat/               # Soulful Companion page
    │   ├── community/          # Community pages
    │   │   └── collections/    # Shell Picks collections
    │   └── coach/              # Recovery Coach page
    ├── components/             # React components
    │   ├── coach/              # Recovery Coach components
    │   ├── community/          # Community components
    │   └── home/               # Home page components
    ├── hooks/                  # Custom hooks
    ├── lib/                    # Utilities & design tokens
    ├── public/                 # Public assets
    └── types/                  # TypeScript type definitions
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

2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

3. Install backend dependencies

```bash
uv sync
```

4. Install frontend dependencies

```bash
cd frontend
nvm install
nvm use
npm install
```

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

# 2. Run
docker compose up -d --build

# 3. Access
open http://localhost:7860
```

### Commands

```bash
docker compose down          # Stop
docker compose up -d --build # Rebuild
docker compose logs -f       # Logs

# Or use Make
make docker-up               # Build and start
make docker-down             # Stop
make docker-logs             # View logs
```

### Single Container (ModelScope)

```bash
docker build -t momshell .
docker run -d -p 7860:7860 --env-file .env momshell
```

## Environment Variables

| Variable                  | Description                             | Required | Default                             |
| ------------------------- | --------------------------------------- | -------- | ----------------------------------- |
| `MODELSCOPE_KEY`          | ModelScope API key for AI services      | Yes      | -                                   |
| `MODELSCOPE_MODEL`        | Model name for chat and feedback        | No       | `Qwen/Qwen2.5-72B-Instruct`         |
| `DATABASE_URL`            | Database connection URL                 | No       | `sqlite+aiosqlite:///./momshell.db` |
| `DEBUG`                   | Enable debug mode                       | No       | `false`                             |
| `MEDIAPIPE_MODEL`         | Pose detection model (`lite` or `full`) | No       | `lite`                              |
| `MIN_TRACKING_CONFIDENCE` | MediaPipe tracking confidence           | No       | `0.3`                               |
| `TTS_VOICE`               | Microsoft Edge TTS voice                | No       | `zh-CN-XiaoxiaoNeural`              |

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
