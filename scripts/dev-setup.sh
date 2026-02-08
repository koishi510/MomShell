#!/usr/bin/env bash
#
# MomShell Development Environment Setup Script
# For new developers after cloning the repository
#
# Usage: ./scripts/dev-setup.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  MomShell Dev Setup Script                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Helper functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# ============================================
# Step 1: Check System Prerequisites
# ============================================
echo ""
echo -e "${BLUE}=== Step 1: Checking System Prerequisites ===${NC}"
echo ""

MISSING_DEPS=()

# Check uv
if check_command uv; then
    UV_VERSION=$(uv --version 2>/dev/null || echo "unknown")
    success "uv installed: $UV_VERSION"
else
    error "uv not found"
    MISSING_DEPS+=("uv")
    echo "  Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# Check nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    success "nvm installed: $(nvm --version 2>/dev/null || echo 'loaded')"
elif check_command nvm; then
    success "nvm installed"
else
    error "nvm not found"
    MISSING_DEPS+=("nvm")
    echo "  Install with: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
fi

# Check git
if check_command git; then
    success "git installed: $(git --version)"
else
    error "git not found"
    MISSING_DEPS+=("git")
fi

# Check git-lfs
if check_command git-lfs; then
    success "git-lfs installed: $(git-lfs --version 2>/dev/null | head -1)"
else
    warn "git-lfs not found (optional, needed for large files)"
    echo "  Install with: sudo apt install git-lfs (Ubuntu) or brew install git-lfs (macOS)"
fi

# Exit if critical dependencies missing
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo ""
    error "Missing required dependencies: ${MISSING_DEPS[*]}"
    echo "Please install them and run this script again."
    exit 1
fi

# ============================================
# Step 2: Setup Environment Variables
# ============================================
echo ""
echo -e "${BLUE}=== Step 2: Setting Up Environment Variables ===${NC}"
echo ""

# Backend .env
if [ -f ".env" ]; then
    success ".env file already exists"
else
    if [ -f ".env.example" ]; then
        cp .env.example .env
        # Generate random JWT secret key
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
        sed -i "s/your-secret-key-change-in-production/$JWT_SECRET/" .env
        success "Created .env from .env.example (JWT secret auto-generated)"
        warn "Please edit .env and fill in your API keys (MODELSCOPE_KEY, etc.)"
    else
        warn ".env.example not found, skipping .env setup"
    fi
fi

# Frontend .env.local (required for local development)
if [ -f "frontend/.env.local" ]; then
    success "frontend/.env.local already exists"
else
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env.local
        success "Created frontend/.env.local from frontend/.env.example"
    else
        warn "frontend/.env.example not found, skipping frontend env setup"
    fi
fi

# ============================================
# Step 3: Initialize Git LFS
# ============================================
echo ""
echo -e "${BLUE}=== Step 3: Initializing Git LFS ===${NC}"
echo ""

if check_command git-lfs; then
    git lfs install --local
    success "Git LFS initialized for this repository"
else
    warn "Skipping Git LFS initialization (git-lfs not installed)"
fi

# ============================================
# Step 4: Setup Backend (Python)
# ============================================
echo ""
echo -e "${BLUE}=== Step 4: Setting Up Backend (Python) ===${NC}"
echo ""

info "Installing Python dependencies with uv..."
cd backend
uv sync
success "Backend dependencies installed"

info "Installing pre-commit hooks..."
uv run pre-commit install
success "Pre-commit hooks installed"

cd "$PROJECT_ROOT"

# ============================================
# Step 5: Setup Frontend (Node.js)
# ============================================
echo ""
echo -e "${BLUE}=== Step 5: Setting Up Frontend (Node.js) ===${NC}"
echo ""

cd frontend

# Load nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi

info "Installing Node.js version from .nvmrc..."
if [ -f ".nvmrc" ]; then
    nvm install
    nvm use
    success "Node.js $(node --version) activated"
else
    warn ".nvmrc not found, using system Node.js"
fi

info "Installing npm dependencies..."
npm install
success "Frontend dependencies installed"

cd "$PROJECT_ROOT"

# ============================================
# Step 6: Verify Setup
# ============================================
echo ""
echo -e "${BLUE}=== Step 6: Verifying Setup ===${NC}"
echo ""

# Check backend venv
if [ -d "backend/.venv" ]; then
    success "Backend virtual environment created"
else
    warn "Backend virtual environment not found"
fi

# Check frontend node_modules
if [ -d "frontend/node_modules" ]; then
    success "Frontend node_modules installed"
else
    warn "Frontend node_modules not found"
fi

# ============================================
# Done!
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Next steps:"
echo ""
echo "  1. Edit .env and add your API keys:"
echo "     - MODELSCOPE_KEY (required)"
echo "     - FIRECRAWL_API_KEY (optional, for web search)"
echo ""
echo "  2. Start the development servers:"
echo ""
echo "     Using Make (recommended):"
echo "       make dev-backend   # Terminal 1: Backend on http://localhost:8000"
echo "       make dev-frontend  # Terminal 2: Frontend on http://localhost:3000"
echo ""
echo "     Or manually:"
echo "       cd backend && uv run uvicorn app.main:app --reload --port 8000"
echo "       cd frontend && npm run dev"
echo ""
echo "  3. Create an admin account (optional):"
echo "     cd backend && uv run python -m scripts.create_admin admin admin@example.com password"
echo ""
echo "  4. Access the application:"
echo "     - Frontend: http://localhost:3000"
echo "     - API Docs: http://localhost:8000/docs"
echo ""
echo "For more information, see README.md and CONTRIBUTING.md"
echo ""
