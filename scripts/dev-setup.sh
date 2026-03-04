#!/usr/bin/env bash
#
# MomShell Development Environment Setup
# Usage: ./scripts/dev-setup.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }

check() { command -v "$1" &>/dev/null; }

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║       MomShell Development Setup           ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. Check dependencies
# ============================================
echo -e "${BLUE}=== 1. Check System Dependencies ===${NC}"

MISSING=()

if check go; then
    success "Go $(go version | awk '{print $3}')"
else
    fail "Go not installed"; MISSING+=("go")
    echo "  Install: https://go.dev/dl/"
fi

if check node; then
    success "Node $(node -v)"
else
    fail "Node not installed"; MISSING+=("node")
    echo "  Install: nvm install (reads frontend/.nvmrc)"
fi

if check npm; then
    success "npm $(npm -v)"
else
    fail "npm not installed"; MISSING+=("npm")
fi

if check git; then
    success "git $(git --version | awk '{print $3}')"
else
    fail "git not installed"; MISSING+=("git")
fi

if check psql; then
    success "PostgreSQL client installed"
else
    warn "psql not installed (optional, for database management)"
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    fail "Missing required dependencies: ${MISSING[*]}"
    exit 1
fi

# ============================================
# 2. Environment variables
# ============================================
echo ""
echo -e "${BLUE}=== 2. Configure Environment Variables ===${NC}"

if [ -f .env ]; then
    success ".env already exists"
else
    cp .env.example .env
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    sed -i "s/change-me-in-production/$JWT_SECRET/" .env
    success "Created .env from .env.example (JWT secret auto-generated)"
    warn "Please edit .env to set OPENAI_API_KEY and database config"
fi

# ============================================
# 3. Backend (Go)
# ============================================
echo ""
echo -e "${BLUE}=== 3. Initialize Backend (Go) ===${NC}"

info "Downloading Go dependencies..."
cd backend && go mod download && cd "$PROJECT_ROOT"
success "Backend dependencies installed"

# ============================================
# 4. Frontend (Vue)
# ============================================
echo ""
echo -e "${BLUE}=== 4. Initialize Frontend (Vue) ===${NC}"

info "Installing npm dependencies..."
cd frontend && npm install && cd "$PROJECT_ROOT"
success "Frontend dependencies installed"

# ============================================
# 5. Pre-commit hooks
# ============================================
echo ""
echo -e "${BLUE}=== 5. Install Pre-commit Hooks ===${NC}"

if check pre-commit; then
    pre-commit install
    success "Pre-commit hooks installed"
else
    warn "pre-commit not installed, skipping hook setup"
    echo "  Install: pip install pre-commit && pre-commit install"
fi

# ============================================
# 6. Verify
# ============================================
echo ""
echo -e "${BLUE}=== 6. Verify ===${NC}"

if cd backend && go build ./... 2>/dev/null; then
    success "Backend build passed"
else
    warn "Backend build failed (database config may be missing)"
fi
cd "$PROJECT_ROOT"

if [ -d frontend/node_modules ]; then
    success "Frontend node_modules installed"
else
    warn "Frontend node_modules not found"
fi

# ============================================
# Done
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║            Setup Complete!                 ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Next steps:"
echo ""
echo "  1. Edit .env to configure database and API keys"
echo ""
echo "  2. Start development servers:"
echo "     make dev-backend    # Backend  http://localhost:8000"
echo "     make dev-frontend   # Frontend http://localhost:5173"
echo "     make dev-tmux       # Or both in tmux"
echo ""
echo "  3. Admin panel: http://localhost:8000/admin"
echo ""
