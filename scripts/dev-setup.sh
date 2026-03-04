#!/usr/bin/env bash
#
# MomShell 开发环境初始化脚本
# 用法: ./scripts/dev-setup.sh
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
echo "║         MomShell 开发环境初始化            ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. 检查依赖
# ============================================
echo -e "${BLUE}=== 1. 检查系统依赖 ===${NC}"

MISSING=()

if check go; then
    success "Go $(go version | awk '{print $3}')"
else
    fail "Go 未安装"; MISSING+=("go")
    echo "  安装: https://go.dev/dl/"
fi

if check node; then
    success "Node $(node -v)"
else
    fail "Node 未安装"; MISSING+=("node")
    echo "  安装: nvm install (读取 frontend/.nvmrc)"
fi

if check npm; then
    success "npm $(npm -v)"
else
    fail "npm 未安装"; MISSING+=("npm")
fi

if check git; then
    success "git $(git --version | awk '{print $3}')"
else
    fail "git 未安装"; MISSING+=("git")
fi

if check psql; then
    success "PostgreSQL 客户端已安装"
else
    warn "psql 未安装（可选，用于数据库管理）"
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    fail "缺少必要依赖: ${MISSING[*]}"
    exit 1
fi

# ============================================
# 2. 环境变量
# ============================================
echo ""
echo -e "${BLUE}=== 2. 配置环境变量 ===${NC}"

if [ -f .env ]; then
    success ".env 已存在"
else
    cp .env.example .env
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    sed -i "s/change-me-in-production/$JWT_SECRET/" .env
    success "已从 .env.example 创建 .env（JWT 密钥已自动生成）"
    warn "请编辑 .env 填入 OPENAI_API_KEY 和数据库配置"
fi

# ============================================
# 3. 后端 (Go)
# ============================================
echo ""
echo -e "${BLUE}=== 3. 初始化后端 (Go) ===${NC}"

info "下载 Go 依赖..."
cd backend && go mod download && cd "$PROJECT_ROOT"
success "后端依赖已安装"

# ============================================
# 4. 前端 (Vue)
# ============================================
echo ""
echo -e "${BLUE}=== 4. 初始化前端 (Vue) ===${NC}"

info "安装 npm 依赖..."
cd frontend && npm install && cd "$PROJECT_ROOT"
success "前端依赖已安装"

# ============================================
# 5. Pre-commit 钩子
# ============================================
echo ""
echo -e "${BLUE}=== 5. 安装 pre-commit 钩子 ===${NC}"

if check pre-commit; then
    pre-commit install
    success "pre-commit 钩子已安装"
else
    warn "pre-commit 未安装，跳过钩子安装"
    echo "  安装: pip install pre-commit && pre-commit install"
fi

# ============================================
# 6. 验证
# ============================================
echo ""
echo -e "${BLUE}=== 6. 验证 ===${NC}"

if cd backend && go build ./... 2>/dev/null; then
    success "后端编译通过"
else
    warn "后端编译失败（可能缺少数据库配置）"
fi
cd "$PROJECT_ROOT"

if [ -d frontend/node_modules ]; then
    success "前端 node_modules 已安装"
else
    warn "前端 node_modules 未找到"
fi

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║              初始化完成!                   ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo "后续步骤:"
echo ""
echo "  1. 编辑 .env 配置数据库和 API 密钥"
echo ""
echo "  2. 启动开发服务器:"
echo "     make dev-backend    # 后端  http://localhost:8000"
echo "     make dev-frontend   # 前端  http://localhost:3000"
echo "     make dev-tmux       # 或用 tmux 同时启动"
echo ""
echo "  3. 访问管理面板: http://localhost:8000/admin"
echo ""
