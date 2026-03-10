# Configuration

Environment variables for configuring MomShell. Copy `.env.example` to `.env` and edit.

## Database

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | — |

Format: `postgres://user:password@host:5432/dbname?sslmode=disable`

## JWT Authentication

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT signing | **Yes** | — |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | No | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | No | `7` |

The setup script auto-generates `JWT_SECRET_KEY`. Change it manually for production.

## OpenAI Compatible API

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | API key for LLM service | **Yes** | — |
| `OPENAI_BASE_URL` | API base URL | No | `https://api-inference.modelscope.cn/v1` |
| `OPENAI_MODEL` | Model name | No | `Qwen/Qwen3-235B-A22B` |
| `IMAGE_MODEL` | Model for AI image generation | No | `Tongyi-MAI/Z-Image-Turbo` |

Any OpenAI-compatible API is supported (ModelScope, OpenAI, local Ollama, etc.).

## Web Search

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FIRECRAWL_API_KEY` | Firecrawl API key for web search grounding | No | — |

When set, AI replies use web search to reduce hallucinations for factual questions.

## Proxy

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TRUST_PROXY` | Trust `X-Forwarded-Proto` header for Secure cookie flag | No | `false` |

Set to `true` when running behind a reverse proxy (Nginx, Cloudflare, etc.) that sets the `X-Forwarded-Proto` header. Required for correct `Secure` cookie flag in HTTPS deployments.

## Server

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | HTTP server port | No | `8000` |

## Frontend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API URL for frontend | No | `http://localhost:8000` |

Leave empty in production when using Nginx reverse proxy.

## Initial Admin Account

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ADMIN_USERNAME` | Admin username | No | — |
| `ADMIN_EMAIL` | Admin email | No | — |
| `ADMIN_PASSWORD` | Admin password | No | — |

Set all three to auto-create an admin on first startup. Skipped if the username or email already exists.

## Runtime Configuration

The following can also be changed at runtime via the admin panel (`/admin` → System Config):

- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`

Read-only in admin panel (requires restart): `DATABASE_URL`, `JWT_ALGORITHM`, `PORT`.

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
