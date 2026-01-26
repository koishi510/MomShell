.PHONY: install install-backend install-frontend dev dev-backend dev-frontend \
        lint lint-backend lint-frontend format format-backend format-frontend \
        typecheck typecheck-backend typecheck-frontend build build-frontend \
        docker-up docker-down docker-logs docker-build clean help

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

##@ Setup

install: install-backend install-frontend ## Install all dependencies
	@echo "$(GREEN)All dependencies installed$(RESET)"

install-backend: ## Install backend dependencies
	@echo "$(CYAN)Installing backend dependencies...$(RESET)"
	uv sync

install-frontend: ## Install frontend dependencies
	@echo "$(CYAN)Installing frontend dependencies...$(RESET)"
	cd frontend && npm install

##@ Development

dev: ## Start both backend and frontend (requires tmux or run in separate terminals)
	@echo "$(YELLOW)Starting development servers...$(RESET)"
	@echo "$(CYAN)Run these commands in separate terminals:$(RESET)"
	@echo "  make dev-backend"
	@echo "  make dev-frontend"
	@echo ""
	@echo "$(CYAN)Or use: make dev-tmux (requires tmux)$(RESET)"

dev-tmux: ## Start both servers in tmux split panes
	@command -v tmux >/dev/null 2>&1 || { echo "tmux is required but not installed."; exit 1; }
	tmux new-session -d -s momshell 'make dev-backend' \; \
		split-window -h 'make dev-frontend' \; \
		attach

dev-backend: ## Start backend development server
	@echo "$(CYAN)Starting backend server on http://localhost:8000$(RESET)"
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend development server
	@echo "$(CYAN)Starting frontend server on http://localhost:3000$(RESET)"
	cd frontend && npm run dev

##@ Code Quality

lint: lint-backend lint-frontend ## Run all linters
	@echo "$(GREEN)All linting passed$(RESET)"

lint-backend: ## Run backend linter (ruff)
	@echo "$(CYAN)Linting backend...$(RESET)"
	uv run ruff check .

lint-frontend: ## Run frontend linter (eslint)
	@echo "$(CYAN)Linting frontend...$(RESET)"
	cd frontend && npm run lint

format: format-backend format-frontend ## Format all code
	@echo "$(GREEN)All code formatted$(RESET)"

format-backend: ## Format backend code (ruff)
	@echo "$(CYAN)Formatting backend...$(RESET)"
	uv run ruff format .
	uv run ruff check . --fix

format-frontend: ## Format frontend code (prettier)
	@echo "$(CYAN)Formatting frontend...$(RESET)"
	cd frontend && npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"

typecheck: typecheck-backend typecheck-frontend ## Run all type checkers
	@echo "$(GREEN)All type checks passed$(RESET)"

typecheck-backend: ## Run backend type checker (mypy)
	@echo "$(CYAN)Type checking backend...$(RESET)"
	uv run mypy app/

typecheck-frontend: ## Run frontend type checker (tsc)
	@echo "$(CYAN)Type checking frontend...$(RESET)"
	cd frontend && npx tsc --noEmit

check: lint typecheck ## Run all checks (lint + typecheck)
	@echo "$(GREEN)All checks passed$(RESET)"

##@ Build

build-frontend: ## Build frontend for production
	@echo "$(CYAN)Building frontend...$(RESET)"
	cd frontend && npm run build

##@ Docker

docker-up: ## Start Docker containers
	@echo "$(CYAN)Starting Docker containers...$(RESET)"
	docker compose up -d --build

docker-down: ## Stop Docker containers
	@echo "$(CYAN)Stopping Docker containers...$(RESET)"
	docker compose down

docker-logs: ## Show Docker logs
	docker compose logs -f

docker-build: ## Build Docker image
	@echo "$(CYAN)Building Docker image...$(RESET)"
	docker build -t momshell .

##@ Database

db-reset: ## Reset database (delete and recreate)
	@echo "$(YELLOW)Resetting database...$(RESET)"
	rm -f momshell.db
	@echo "$(GREEN)Database reset. It will be recreated on next server start.$(RESET)"

##@ Dependencies

deps-lock: ## Lock backend dependencies and export requirements.txt
	@echo "$(CYAN)Locking dependencies...$(RESET)"
	uv lock
	uv export > requirements.txt
	@echo "$(GREEN)Dependencies locked$(RESET)"

deps-update: ## Update all dependencies
	@echo "$(CYAN)Updating backend dependencies...$(RESET)"
	uv lock --upgrade
	uv export > requirements.txt
	@echo "$(CYAN)Updating frontend dependencies...$(RESET)"
	cd frontend && npm update
	@echo "$(GREEN)All dependencies updated$(RESET)"

##@ Cleanup

clean: ## Clean all caches and temporary files
	@echo "$(CYAN)Cleaning caches...$(RESET)"
	rm -rf .mypy_cache .ruff_cache .pytest_cache __pycache__
	rm -rf frontend/.next frontend/node_modules/.cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)Caches cleaned$(RESET)"

clean-all: clean ## Clean everything including node_modules and .venv
	@echo "$(YELLOW)Removing node_modules and .venv...$(RESET)"
	rm -rf frontend/node_modules .venv
	@echo "$(GREEN)All cleaned$(RESET)"

##@ Help

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(CYAN)Usage:$(RESET)\n  make $(GREEN)<target>$(RESET)\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(YELLOW)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help
