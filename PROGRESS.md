# PROGRESS.md

Project progress tracker. Updated as work is completed.

## Completed

### Project Setup (2026-01-22 ~ 2026-01-24)
- [x] Repository init with license, CI, gitignore, pre-commit
- [x] Initial Python/FastAPI backend with recovery coach modules
- [x] Initial Next.js/React frontend
- [x] Docker and deployment config
- [x] Contributing guide and PR templates

### Go + Vue Rewrite (2026-03-04)
- [x] Go backend with Gin, GORM, PostgreSQL (`backend/`)
- [x] Vue 3 + Vite + TypeScript frontend (`frontend/`)
- [x] Remove legacy Python/Next.js codebase
- [x] Rewrite CI, Makefile, dev-setup.sh, .env.example for new stack
- [x] Embedded admin panel with user CRUD and config management

### Beach Scene UI (2026-03-04 ~ 2026-03-06)
- [x] Composable-driven scene: sky, sun, clouds, ocean, waves, sand, seagulls
- [x] Parallax and animation systems (`useParallax`, `useAnimationLoop`, `useWaveSystem`)
- [x] Sprite layer with interactive beach assets
- [x] Landing overlay and hint system

### Core Features (2026-03-04 ~ 2026-03-05)
- [x] JWT auth with access/refresh tokens, remember me, auto-refresh
- [x] Auth middleware: `AuthRequired`, `AuthOptional`, `AdminRequired`
- [x] AI chat (Soul Companion) with session persistence and visual effects
- [x] Community Q&A (Sisterhood Bond) with full backend API
- [x] Echo/memoir backend module with AI-generated memory stickers
- [x] User center with profile, stats, and settings
- [x] Unified Docker deployment with root Dockerfile
- [x] Vite proxy for API during development

### Recent Features (2026-03-05 ~ 2026-03-07)
- [x] Profile editing with avatar upload
- [x] Shell code partner binding and shared memoirs
- [x] Admin flag and `is_admin` field (replaces role-based admin)
- [x] Display tags in community panel
- [x] Community panel overhaul
- [x] Migrate AI provider to Qwen3 model via ModelScope
- [x] golangci-lint integration and error fixes

### Tooling (2026-03-07)
- [x] CLAUDE.md for Claude Code onboarding
- [x] SKILL.md with extracted repo patterns
- [x] Project-scoped instincts for continuous learning

## In Progress

- [ ] (nothing currently tracked)

## Planned / Not Started

- [ ] Backend unit tests (`_test.go` files — none exist yet)
- [ ] Frontend test setup (no vitest/jest configured)
- [ ] Guardian module frontend integration
- [ ] Content moderation UI
- [ ] User certification workflow
