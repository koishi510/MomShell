# MomShell

An AI powered assistant for postpartum mothers.

## Features

- **Recovery Coach**: AI-powered postpartum exercise coaching with real-time pose detection and voice feedback
- **Soulful Companion**: Emotional support chat companion powered by Zhipu GLM-4
- **Community**: Mutual support community for postpartum mothers to share experiences and get professional advice
  - Dual-channel system: Professional Channel (doctors' advice) & Experience Channel (moms' stories)
  - Verified healthcare professionals: doctors, therapists, nurses
  - Q&A with likes, collections, and content moderation
  - Daily Resonance topics and Shell Picks (collections)

## Tech Stack

### Backend
- **FastAPI** - High-performance async web framework
- **MediaPipe** - Real-time pose detection (33 landmarks)
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
├── app/                    # FastAPI backend
│   ├── api/               # API routes (REST + WebSocket)
│   ├── core/              # Configuration and database
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
│       ├── chat/          # Soulful Companion service
│       └── rehab/         # Recovery Coach service
│           ├── pose/      # MediaPipe pose detection
│           ├── exercises/ # Exercise library
│           ├── analysis/  # Pose analysis & scoring
│           ├── feedback/  # LLM feedback & TTS
│           ├── progress/  # Progress tracking
│           └── workflow/  # LangGraph workflow
└── frontend/              # Next.js frontend
    ├── app/               # App router pages
    │   ├── community/     # Community pages
    │   ├── companion/     # Soulful Companion page
    │   └── rehab/         # Recovery Coach page
    ├── components/        # React components
    │   ├── community/     # Community components
    │   ├── companion/     # Companion components
    │   └── home/          # Home page components
    ├── hooks/             # Custom hooks
    ├── lib/               # Utilities & design tokens
    └── types/             # TypeScript type definitions
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
git clone https://github.com/your-username/MomShell.git
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

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LLM_API_KEY` | API key for LLM provider (OpenAI-compatible) | Yes | - |
| `LLM_BASE_URL` | Custom API endpoint (leave empty for OpenAI) | No | - |
| `LLM_MODEL` | Model name for feedback generation | No | `gpt-3.5-turbo` |
| `ZHIPUAI_API_KEY` | Zhipu AI API key for chat companion | No | - |
| `DATABASE_URL` | Database connection URL | No | `sqlite+aiosqlite:///./momshell.db` |
| `DEBUG` | Enable debug mode | No | `false` |
| `MIN_TRACKING_CONFIDENCE` | MediaPipe tracking confidence | No | `0.3` |
| `TTS_VOICE` | Microsoft Edge TTS voice | No | `zh-CN-XiaoxiaoNeural` |

See `.env.example` for all available configuration options.

## Architecture Highlights

### Real-time Pose Detection
- Uses MediaPipe Pose Landmarker with VIDEO mode for tracking
- FULL model for better accuracy
- Client-side skeleton rendering for minimal latency

### Non-blocking Feedback
- LLM feedback generation runs in background
- TTS synthesis is fire-and-forget
- No blocking of the frame processing pipeline

### WebSocket Protocol
- Real-time bidirectional communication
- Client sends video frames, server returns keypoints
- Skeleton drawn on client side for smooth 20+ FPS experience

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
