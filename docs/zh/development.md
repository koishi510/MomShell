# 开发指南

## 前置要求

- Go 1.25+
- Node.js 24+
- PostgreSQL
- Git
- pre-commit（可选，用于 git 钩子）

安装链接请参阅[快速开始](getting-started.md)。

## 安装

### 自动安装（推荐）

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh
```

### 手动安装

```bash
cp .env.example .env   # 编辑配置

cd backend && go mod download && cd ..
cd frontend && npm install && cd ..

# 可选：安装 git 钩子
pre-commit install
```

## 本地运行

### 使用 Make

```bash
make dev-backend    # 终端 1 — Go 服务 :8000
make dev-frontend   # 终端 2 — Vite 开发服务器 :5173
make dev-tmux       # 或使用 tmux 同时运行
```

### 手动命令

```bash
# 后端
cd backend && go run cmd/server/main.go

# 前端
cd frontend && npx vite
```

## 常用命令

```bash
make lint          # go vet + eslint
make format        # go fmt
make typecheck     # go build + vue-tsc
make check         # lint + typecheck

make build-backend   # 构建 Go 二进制文件
make build-frontend  # Vite 生产构建
```

## 贡献

请参阅 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解代码规范、提交约定和 PR 工作流程。

---

[返回文档索引](README.md) | [返回主 README](../../README.md)
