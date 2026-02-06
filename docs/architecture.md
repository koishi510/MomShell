# Architecture

Technical architecture overview of MomShell.

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **MediaPipe** | Real-time pose detection (33 landmarks) |
| **LangGraph** | Workflow orchestration for coaching logic |
| **Edge TTS** | Microsoft neural voice synthesis |
| **SQLite + SQLAlchemy** | Lightweight async database |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |

## Project Structure

```
MomShell/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/             # REST + WebSocket routes
│   │   ├── core/               # Configuration and database
│   │   ├── models/             # ML models dir (gitignored)
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   │       ├── auth/           # JWT, OAuth authentication
│   │       ├── chat/           # Soul Companion service
│   │       ├── coach/          # Recovery Coach service
│   │       │   ├── analysis/   # Pose analysis & scoring
│   │       │   ├── exercises/  # Exercise library
│   │       │   ├── feedback/   # LLM feedback & TTS
│   │       │   ├── pose/       # MediaPipe detection
│   │       │   ├── progress/   # Progress tracking
│   │       │   └── workflow/   # LangGraph workflow
│   │       ├── community/      # Sisterhood Bond service
│   │       ├── guardian/       # Guardian Partner service
│   │       └── web_search.py   # Firecrawl integration
│   ├── scripts/                # CLI scripts
│   └── tests/                  # Backend tests
│
├── frontend/                   # Next.js frontend
│   ├── app/                    # App router pages
│   │   ├── auth/               # Login, register, etc.
│   │   ├── chat/               # Soul Companion
│   │   ├── coach/              # Recovery Coach
│   │   ├── community/          # Sisterhood Bond
│   │   └── guardian/           # Guardian Partner
│   ├── components/             # React components
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilities & API clients
│   └── types/                  # TypeScript definitions
│
├── deploy/                     # Deployment configs
│   ├── docker-compose.yml
│   └── nginx.conf
│
└── Dockerfile                  # Combined container
```

## Architecture Highlights

### Real-time Pose Detection

- Uses MediaPipe Pose Landmarker with VIDEO mode for tracking
- LITE model by default for better performance (configurable via `MEDIAPIPE_MODEL`)
- Client-side skeleton rendering for minimal latency
- WebSocket protocol for real-time bidirectional communication

### Non-blocking Feedback Pipeline

```
Video Frame → Pose Detection → Analysis
                                   ↓
                            [Background]
                                   ↓
                         LLM Feedback Generation
                                   ↓
                            TTS Synthesis
                                   ↓
                           Audio Response
```

- LLM feedback generation runs in background
- TTS synthesis is fire-and-forget
- No blocking of the frame processing pipeline

### WebSocket Protocol

- Client sends video frames
- Server returns keypoints
- Skeleton drawn on client side for smooth 20+ FPS experience

### Data Flow

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│  (Next.js + React + TypeScript + Tailwind)      │
└─────────────────────┬───────────────────────────┘
                      │ REST / WebSocket
                      ▼
┌─────────────────────────────────────────────────┐
│                    Backend                       │
│              (FastAPI + Python)                 │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │   Auth   │ │   Chat   │ │    Community     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────┐ ┌───────────────────┐ │
│  │   Recovery Coach     │ │ Guardian Partner  │ │
│  │  (MediaPipe + LLM)   │ │   (Task System)   │ │
│  └──────────────────────┘ └───────────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ SQLite  │  │ ModelScope│  │ Firecrawl │
   │   DB    │  │   (LLM)  │  │  (Search) │
   └─────────┘  └──────────┘  └──────────┘
```

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
