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
    fail "psql not installed"; MISSING+=("postgresql")
    echo "  Install: sudo pacman -S postgresql (Arch) / sudo apt install postgresql (Debian)"
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    fail "Missing required dependencies: ${MISSING[*]}"
    exit 1
fi

# ============================================
# 2. PostgreSQL
# ============================================
echo ""
echo -e "${BLUE}=== 2. Setup PostgreSQL ===${NC}"

DB_NAME="momshell"
DB_USER="momshell"
DB_PASS="momshell"

# Check if PostgreSQL service is running
if pg_isready -q 2>/dev/null; then
    success "PostgreSQL is running"
else
    warn "PostgreSQL is not running, attempting to start..."
    if sudo systemctl start postgresql 2>/dev/null; then
        success "PostgreSQL started"
    else
        fail "Could not start PostgreSQL"
        echo "  Try: sudo systemctl start postgresql"
        echo "  Arch first-time: sudo -u postgres initdb -D /var/lib/postgres/data"
        exit 1
    fi
fi

# Create database user if not exists
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
    success "Database user '$DB_USER' exists"
else
    info "Creating database user '$DB_USER'..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null
    success "Database user '$DB_USER' created"
fi

# Create database if not exists
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
    success "Database '$DB_NAME' exists"
else
    info "Creating database '$DB_NAME'..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
    success "Database '$DB_NAME' created"
fi

# Test connection
if PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
    success "Database connection verified"
else
    warn "Could not connect via localhost, check pg_hba.conf allows password auth"
    echo "  Add to pg_hba.conf: host all all 127.0.0.1/32 md5"
fi

# ============================================
# 3. Environment variables
# ============================================
echo ""
echo -e "${BLUE}=== 3. Configure Environment Variables ===${NC}"

# Helper: prompt for a value with a default; empty input keeps the default
# Usage: ask "PROMPT" "DEFAULT" -> sets REPLY
ask() {
    local prompt="$1" default="$2"
    if [ -n "$default" ]; then
        echo -en "  ${prompt} ${YELLOW}[${default}]${NC}: "
    else
        echo -en "  ${prompt}: "
    fi
    read -r REPLY
    [ -z "$REPLY" ] && REPLY="$default"
}

if [ -f .env ]; then
    success ".env already exists, skipping interactive config"
else
    info "Creating .env — press Enter to accept defaults, leave blank to skip"
    echo ""

    # Database (auto-filled from step 2)
    echo -e "  ${BLUE}-- Database --${NC}"
    DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?sslmode=disable"
    ask "DATABASE_URL" "$DATABASE_URL"
    DATABASE_URL="$REPLY"

    # JWT
    echo -e "  ${BLUE}-- JWT --${NC}"
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    ask "JWT_SECRET_KEY" "$JWT_SECRET"
    JWT_SECRET_KEY="$REPLY"

    ask "JWT_ACCESS_TOKEN_EXPIRE_MINUTES" "30"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES="$REPLY"

    ask "JWT_REFRESH_TOKEN_EXPIRE_DAYS" "7"
    JWT_REFRESH_TOKEN_EXPIRE_DAYS="$REPLY"

    # OpenAI
    echo -e "  ${BLUE}-- OpenAI Compatible API --${NC}"
    ask "OPENAI_API_KEY" ""
    OPENAI_API_KEY="$REPLY"

    ask "OPENAI_BASE_URL" "https://api-inference.modelscope.cn/v1"
    OPENAI_BASE_URL="$REPLY"

    ask "OPENAI_MODEL" "Qwen/Qwen2.5-72B-Instruct"
    OPENAI_MODEL="$REPLY"

    # Server
    echo -e "  ${BLUE}-- Server --${NC}"
    ask "PORT" "8000"
    PORT="$REPLY"

    # Frontend
    echo -e "  ${BLUE}-- Frontend --${NC}"
    ask "VITE_API_BASE_URL" "http://localhost:8000"
    VITE_API_BASE_URL="$REPLY"

    # Admin
    echo -e "  ${BLUE}-- Initial Admin (optional) --${NC}"
    ask "ADMIN_USERNAME" ""
    ADMIN_USERNAME="$REPLY"

    ask "ADMIN_EMAIL" ""
    ADMIN_EMAIL="$REPLY"

    ask "ADMIN_PASSWORD" ""
    ADMIN_PASSWORD="$REPLY"

    # Write .env
    cat > .env <<ENVEOF
# MomShell Environment Configuration

# ==================== Database ====================
DATABASE_URL=$DATABASE_URL

# ==================== JWT ====================
JWT_SECRET_KEY=$JWT_SECRET_KEY
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=$JWT_ACCESS_TOKEN_EXPIRE_MINUTES
JWT_REFRESH_TOKEN_EXPIRE_DAYS=$JWT_REFRESH_TOKEN_EXPIRE_DAYS

# ==================== OpenAI Compatible API ====================
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_BASE_URL=$OPENAI_BASE_URL
OPENAI_MODEL=$OPENAI_MODEL

# ==================== Server ====================
PORT=$PORT

# ==================== Frontend ====================
VITE_API_BASE_URL=$VITE_API_BASE_URL

# ==================== Initial Admin (optional, created on first startup) ====================
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
ENVEOF

    echo ""
    success ".env created"
fi

# ============================================
# 4. Backend (Go)
# ============================================
echo ""
echo -e "${BLUE}=== 4. Initialize Backend (Go) ===${NC}"

info "Downloading Go dependencies..."
cd backend && go mod download && cd "$PROJECT_ROOT"
success "Backend dependencies installed"

# ============================================
# 5. Frontend (Vue)
# ============================================
echo ""
echo -e "${BLUE}=== 5. Initialize Frontend (Vue) ===${NC}"

info "Installing npm dependencies..."
cd frontend && npm install && cd "$PROJECT_ROOT"
success "Frontend dependencies installed"

# ============================================
# 6. Pre-commit hooks
# ============================================
echo ""
echo -e "${BLUE}=== 6. Install Pre-commit Hooks ===${NC}"

if check pre-commit; then
    pre-commit install
    success "Pre-commit hooks installed"
else
    warn "pre-commit not installed, skipping hook setup"
    echo "  Install: pip install pre-commit && pre-commit install"
fi

# ============================================
# 7. Verify
# ============================================
echo ""
echo -e "${BLUE}=== 7. Verify ===${NC}"

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
echo "  1. Start development servers:"
echo "     make dev-backend    # Backend  http://localhost:8000"
echo "     make dev-frontend   # Frontend http://localhost:5173"
echo "     make dev-tmux       # Or both in tmux"
echo ""
echo "  2. Admin panel: http://localhost:8000/admin"
echo ""
echo "  3. Edit .env anytime to update configuration"
echo ""
