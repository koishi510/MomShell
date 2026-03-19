# Architecture

Technical architecture overview of MomShell.

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Go 1.25** | Backend language |
| **Gin** | HTTP framework |
| **GORM** | ORM (PostgreSQL) |
| **pgvector** | Vector similarity search for Deep RAG |
| **JWT (golang-jwt)** | Authentication (httpOnly cookies) |
| **OpenAI SDK** | LLM integration (Qwen / any OpenAI-compatible) |
| **Firecrawl** | Web search for grounding AI responses |
| **go:embed** | Embedded admin panel |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Vue 3** | UI framework |
| **Vite 8** | Build tool |
| **TypeScript** | Type safety |
| **Pinia** | State management |
| **Axios** | HTTP client |
| **GSAP** | Animations |
| **Three.js** | 3D graphics |
| **MediaPipe** | Hand detection |

## Project Structure

```
MomShell/
├── backend/                    # Go backend
│   ├── cmd/server/main.go      # Entry point & dependency wiring
│   ├── internal/
│   │   ├── admin/              # Embedded admin panel (go:embed HTML)
│   │   ├── config/             # Environment config loader
│   │   ├── database/           # DB connection & auto-migration
│   │   ├── dto/                # Request/response data transfer objects
│   │   ├── fileutil/           # Shared file utilities (deletion helper)
│   │   ├── handler/            # HTTP handlers (Gin)
│   │   ├── middleware/         # Auth, CORS, recovery, rate limiting
│   │   ├── model/              # GORM models (User, Task, Achievement, PerkCard,
│   │   │                       #   FutureLetter, RAGDocument, ChatMemory, etc.)
│   │   ├── repository/         # Data access layer
│   │   ├── router/             # Route registration
│   │   ├── scheduler/          # Background job scheduling (photo cleanup)
│   │   └── service/            # Business logic
│   └── pkg/
│       ├── firecrawl/          # Web search API client
│       ├── jwt/                # JWT generation & validation
│       ├── openai/             # OpenAI-compatible client
│       └── password/           # bcrypt hashing
│
├── frontend/                   # Vue 3 frontend
│   └── src/
│       ├── assets/
│       │   ├── audio/          # Background music tracks
│       │   └── images/         # Scene sprites, icons, backgrounds
│       ├── components/
│       │   ├── dad/            # Dad console modules (DadConsole, DcHome, DcChat,
│       │   │                   #   DcCommunity, DcDashboard, DcTaskList, DcTaskCard,
│       │   │                   #   DcWhisper, DcProfile, DcAiMemory, DcHeader, DcTabBar,
│       │   │                   #   DcAgePicker, DcMemoryCardDialog)
│       │   ├── overlay/        # UI panels (Auth, Chat, Community, AiMemory, Bar, Car,
│       │   │                   #   Whisper, Task, Profile, RoleSelect, AnimeLanding,
│       │   │                   #   NeutralLanding, ConfirmDialog)
│       │   ├── react/          # React components (PearlShell 3D scene)
│       │   ├── task/           # Task dashboard visuals (skill radar, etc.)
│       │   └── scene/          # Beach scene layers (sky, ocean, sand, etc.)
│       ├── composables/        # Vue composables (animation, parallax, waves, music,
│       │                       #   mobile detection, tutorial, input handling)
│       ├── constants/          # Scene configuration
│       ├── lib/
│       │   ├── api/            # API modules (chat, community, echo, photo, task,
│       │   │                   #   perkCard, user, whisper)
│       │   ├── apiClient.ts    # Axios instance with JWT interceptor
│       │   └── auth.ts         # Raw fetch auth calls (register, login, refresh)
│       ├── stores/             # Pinia stores (auth, UI)
│       ├── styles/             # CSS
│       ├── types/              # TypeScript type definitions
│       └── utils/              # Shared utility functions
│
├── deploy/                     # Docker Compose + Nginx config
├── docs/                       # Documentation
├── scripts/                    # Development setup scripts
├── .env.example                # Environment template
├── Makefile                    # Build & dev commands
└── .pre-commit-config.yaml     # Git hooks
```

## Architecture Layers

```
Handler (HTTP) → Service (Business Logic) → Repository (Data Access) → GORM → PostgreSQL
```

- **Handler**: Parses HTTP requests, validates input, calls service, returns JSON
- **Service**: Business rules, authorization checks, cross-cutting concerns
- **Repository**: Database queries via GORM, no business logic
- **Model**: GORM structs with table mappings and relationships
- **DTO**: Request/response types, decoupled from models

## Key Design Decisions

### Embedded Admin Panel

The admin panel is a single HTML file (`internal/admin/admin.html`) using Tailwind CSS CDN and Alpine.js. It's embedded into the Go binary via `go:embed`, requiring no separate frontend build or deployment.

### Authentication

- JWT access tokens (30 min) + refresh tokens (7 days), stored in httpOnly cookies
- Tokens extracted from `Authorization: Bearer`, `X-Access-Token` header, or `access_token` cookie
- Admin role verified per-request in handler via `authService.GetUserByID`
- Fixed-window rate limiting on all API endpoints

### AI Companion Memory

Three-phase memory system for the Soul Companion:

1. **Conversation turns** — Raw user/assistant exchanges stored as JSON in `ChatMemory.ConversationTurns`
2. **Conversation summary** — Auto-generated summary when turns exceed 20; keeps recent 15 turns + compressed summary
3. **Structured memory facts** — `ChatMemoryFact` model with category classification (family, interest, concern, personal_info, preference, other); auto-extracted from AI responses and deduplicated

Role-based system prompts adjust tone for mom, dad, and professional users.

### Content Moderation

- Keyword-based detection with categories (pseudoscience, violence, self-harm, spam)
- Crisis keywords trigger auto-rejection
- Results: Passed / Rejected / NeedManualReview

### Deep RAG

Semantic retrieval-augmented generation using pgvector:

- Documents are chunked and embedded via ModelScope-hosted embedding models
- Embeddings stored in PostgreSQL using the pgvector extension (`RAGDocument` model)
- At query time, vector similarity search retrieves relevant chunks to ground AI responses with factual context

### Future Letters

Replaced the shell gift system with a time-space care engine:

- Task completions trigger AI-generated future letters with contextual, time-aware messages
- `FutureLetter` model stores letter content, delivery timing, and association to tasks
- Mom receives meaningful letters over time rather than one-shot blind-box gifts

### Deployment Modes

- **Docker Compose**: Nginx + Go + PostgreSQL as separate containers, port 80
- **ModelScope standalone**: Single container with embedded PostgreSQL, nginx on port 7860, auto-initialized via entrypoint

## Data Flow

```
Frontend (Vue 3 / Vite 8)
    ↕ REST API (JSON)
Backend (Go / Gin)
    ↕ GORM
PostgreSQL + pgvector
    ↕ HTTP
OpenAI-compatible LLM + ModelScope Embeddings
```

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
