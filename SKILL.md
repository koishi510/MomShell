---
name: momshell-patterns
description: Coding patterns extracted from MomShell repository (Go + Vue 3 fullstack)
version: 1.0.0
source: local-git-analysis
analyzed_commits: 200
---

# MomShell Patterns

## Project Overview

MomShell is a fullstack application with a **Go backend** (Gin + GORM + PostgreSQL) and a **Vue 3 frontend** (Vite + TypeScript + Pinia). The UI features a beach-themed interactive scene with overlay panels for community, chat, profile, and admin features.

## Commit Conventions

This project uses **conventional commits** (200 commits analyzed):

| Type | Count | Usage |
|------|-------|-------|
| `chore:` | 90 (45%) | Dependency bumps (Dependabot), config changes |
| `feat:` | 47 (24%) | New features and integrations |
| `docs:` | 22 (11%) | Documentation updates |
| `fix:` | 15 (8%) | Bug fixes |
| `perf:` | 12 (6%) | CSS and performance optimizations |
| `refactor:` | 8 (4%) | Code restructuring |
| `test:` | 2 (1%) | Test additions |

Scoped commits for deps: `chore(deps): bump <package> from X to Y in /<dir>`

## Code Architecture

### Backend (Go - Gin Framework)

```
backend/
├── cmd/server/main.go          # Entrypoint, wires all dependencies
├── internal/
│   ├── admin/                  # Embedded admin HTML panel
│   ├── config/config.go        # Environment-based configuration
│   ├── database/
│   │   ├── database.go         # GORM connection setup
│   │   └── migrate.go          # Auto-migration definitions
│   ├── dto/                    # Request/response DTOs (per domain)
│   ├── handler/                # HTTP handlers (per domain)
│   ├── middleware/              # Auth, CORS, recovery middleware
│   ├── model/                  # GORM models (database entities)
│   ├── repository/             # Data access layer (per domain)
│   ├── router/router.go        # All route definitions in one file
│   └── service/                # Business logic (per domain)
├── pkg/
│   ├── jwt/jwt.go              # JWT token generation/validation
│   ├── openai/client.go        # OpenAI-compatible API client
│   └── password/password.go    # Password hashing utilities
└── uploads/avatars/            # User-uploaded files
```

**Layered architecture**: `handler -> service -> repository -> model`

Each domain (user, chat, echo, community, admin) follows this pattern with matching files across layers.

### Frontend (Vue 3 + Vite + TypeScript)

```
frontend/src/
├── assets/                     # Static images (PNG sprites)
├── components/
│   ├── overlay/                # UI panels (AuthPanel, ChatPanel, etc.)
│   └── scene/                  # Beach scene layers (Sky, Ocean, Sand, etc.)
├── composables/                # Vue composables (useAnimationLoop, useParallax, etc.)
├── constants/                  # Static config (colors, layers, sprites, waves)
├── lib/
│   ├── api/                    # API client modules (per domain: chat, community, echo, user)
│   ├── apiClient.ts            # Axios instance with auth interceptors
│   └── auth.ts                 # Authentication utilities
├── stores/                     # Pinia stores (auth, ui)
├── styles/                     # Global CSS (animations, reset, variables)
├── types/                      # TypeScript type definitions
└── utils/                      # Utility functions
```

## Workflows

### Adding a New Backend Feature

Files always change together in this pattern:

1. **Model**: Create `backend/internal/model/<domain>.go` (GORM struct)
2. **DTO**: Create `backend/internal/dto/<domain>.go` (request/response types)
3. **Repository**: Create `backend/internal/repository/<domain>.go` (data access)
4. **Service**: Create `backend/internal/service/<domain>.go` (business logic)
5. **Handler**: Create `backend/internal/handler/<domain>.go` (HTTP handlers)
6. **Router**: Update `backend/internal/router/router.go` (add routes)
7. **Migration**: Update `backend/internal/database/migrate.go` (add model to AutoMigrate)
8. **Main**: Update `backend/cmd/server/main.go` (wire new handler)

### Adding a New Frontend Feature

1. **API client**: Create `frontend/src/lib/api/<domain>.ts`
2. **Overlay panel**: Create `frontend/src/components/overlay/<Name>Panel.vue`
3. **Store** (if stateful): Update or create in `frontend/src/stores/`
4. **Types**: Add types in `frontend/src/types/`

### Full-Stack Feature (Most Common)

Based on co-change analysis, full-stack features touch both sides simultaneously:

**Backend files**: `dto/<domain>.go`, `handler/<domain>.go`, `service/<domain>.go`, `repository/<domain>.go`, `model/<domain>.go`, `router/router.go`, `cmd/server/main.go`

**Frontend files**: `lib/api/<domain>.ts`, `components/overlay/<Name>Panel.vue`, `lib/auth.ts`, `stores/auth.ts`

### Database Migration

GORM AutoMigrate is used - no manual migration files:
1. Define or modify model in `backend/internal/model/`
2. Add model to `migrate.go` AutoMigrate call
3. Restart backend server

## File Co-Change Patterns

**Most frequently changed files** (hotspots):

| File | Changes | Role |
|------|---------|------|
| `Makefile` | 11 | Build orchestration |
| `.github/workflows/ci.yml` | 11 | CI pipeline |
| `scripts/dev-setup.sh` | 10 | Developer onboarding |
| `.env.example` | 10 | Environment template |
| `Dockerfile` | 8 | Container config |

**Backend/frontend co-change ratio**: ~50/50 (491 backend vs 522 frontend file changes)

## API Patterns

- Base path: `/api/v1`
- Auth: JWT tokens via `middleware.AuthRequired(cfg)` / `middleware.AuthOptional(cfg)`
- Admin: `middleware.AdminRequired(cfg)`
- RESTful routes grouped by domain
- Static file serving for uploads at `/uploads`

## Tech Stack

### Backend
- **Go 1.24** with Gin web framework
- **GORM** ORM with PostgreSQL driver
- **golang-jwt/v5** for authentication
- **godotenv** for environment management
- **bcrypt** (via golang.org/x/crypto) for password hashing

### Frontend
- **Vue 3** (Composition API)
- **Vite 7** build tool
- **TypeScript ~5.9**
- **Pinia** for state management
- **Axios** for HTTP client
- **ESLint** + **vue-tsc** for linting and type checking
- No CSS framework - custom CSS with animations

### Infrastructure
- **Docker** + Docker Compose for deployment
- **GitHub Actions** CI (frontend lint/typecheck/build, Go vet/golangci-lint/build/test)
- **Dependabot** for automated dependency updates
- **PostgreSQL** database (systemd-managed locally)

## Development Commands

```bash
make install           # Install all dependencies
make dev-backend       # Start Go server on :8000 (auto-starts PostgreSQL)
make dev-frontend      # Start Vite dev server on :5173
make dev-tmux          # Start both in tmux split panes
make lint              # Run all linters (go vet + eslint)
make typecheck         # Run all type checkers (go build + vue-tsc)
make check             # lint + typecheck
make docker-up         # Start via Docker Compose
make db-reset          # Drop and recreate database schema
```

## Testing Patterns

- Backend: `go test ./...` (run in CI)
- Frontend: No test runner configured yet (no vitest/jest in package.json)
- CI runs: ESLint, vue-tsc, vite build, go vet, golangci-lint, go build, go test
- **Gap**: No project-specific test files found - tests are a growth area

## Naming Conventions

- **Backend Go files**: lowercase, domain-named (e.g., `user.go`, `echo.go`, `chat.go`)
- **Frontend Vue components**: PascalCase with suffix (`AuthPanel.vue`, `BeachScene.vue`)
- **Frontend composables**: `use` prefix (`useParallax.ts`, `useWaveSystem.ts`)
- **Frontend API modules**: lowercase domain name (`chat.ts`, `community.ts`)
- **Frontend stores**: lowercase domain name (`auth.ts`, `ui.ts`)
- **Constants**: lowercase descriptive (`colors.ts`, `layers.ts`, `sprites.ts`)

## Branch Strategy

- Main development branch: `feat/beach`
- Feature branches merged into `feat/beach`
- CI runs on all branches and PRs
