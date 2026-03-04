# Architecture

Technical architecture overview of MomShell.

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Go 1.23** | Backend language |
| **Gin** | HTTP framework |
| **GORM** | ORM (PostgreSQL) |
| **JWT (golang-jwt)** | Authentication |
| **OpenAI SDK** | LLM integration |
| **go:embed** | Embedded admin panel |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Vue 3** | UI framework |
| **Vite** | Build tool |
| **TypeScript** | Type safety |
| **Pinia** | State management |
| **Axios** | HTTP client |

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
│   │   ├── handler/            # HTTP handlers (Gin)
│   │   ├── middleware/         # Auth, CORS, recovery middleware
│   │   ├── model/              # GORM models (User, Question, Answer, etc.)
│   │   ├── repository/         # Data access layer
│   │   ├── router/             # Route registration
│   │   └── service/            # Business logic
│   └── pkg/
│       ├── jwt/                # JWT generation & validation
│       ├── openai/             # OpenAI-compatible client
│       └── password/           # bcrypt hashing
│
├── frontend/                   # Vue 3 frontend
│   └── src/
│       ├── components/
│       │   ├── overlay/        # Auth, chat, community, profile panels
│       │   └── scene/          # Beach scene layers (sky, ocean, sand, etc.)
│       ├── composables/        # Vue composables (animation, parallax, waves)
│       ├── constants/          # Scene configuration
│       ├── lib/                # API client, auth utilities
│       ├── stores/             # Pinia stores (auth, UI)
│       └── styles/             # CSS
│
├── deploy/                     # Docker Compose + Nginx config
├── docs/                       # Documentation
├── scripts/dev-setup.sh        # Development setup script
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

- JWT access tokens (30 min) + refresh tokens (7 days)
- Tokens extracted from `Authorization: Bearer`, `X-Access-Token` header, or `access_token` cookie
- Admin role verified per-request in handler via `authService.GetUserByID`

### Content Moderation

- Keyword-based detection with categories (pseudoscience, violence, self-harm, spam)
- Crisis keywords trigger auto-rejection
- Results: Passed / Rejected / NeedManualReview

## Data Flow

```
Frontend (Vue 3 / Vite)
    ↕ REST API (JSON)
Backend (Go / Gin)
    ↕ GORM
PostgreSQL
    ↕ HTTP
OpenAI-compatible LLM
```

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
