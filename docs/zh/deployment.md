# Docker 部署

## 前置要求

```bash
# Arch Linux
sudo pacman -S docker docker-compose

# Ubuntu/Debian
sudo apt install docker.io docker-compose

sudo systemctl start docker
sudo systemctl enable docker
```

## 快速开始（Docker Compose）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env：取消注释 Docker DATABASE_URL 行（postgres 主机）
# 设置 JWT_SECRET_KEY、OPENAI_API_KEY 等

# 2. 启动所有服务
make docker-up

# 3. 访问
# 应用：        http://localhost
# 管理面板：    http://localhost/admin
```

## 架构

单个 Docker 镜像同时包含前端和后端：

```
浏览器 → Nginx (:80)
            ├── /            → 静态文件（Vue SPA）
            ├── /api/        → 代理 → Go 后端 (:8000)
            ├── /uploads/    → 代理 → Go 后端 (:8000)
            └── /admin       → 代理 → Go 后端 (:8000)
```

`docker-compose.yml`（位于 `deploy/` 目录）运行两个容器：

| 服务 | 镜像 | 端口 |
|------|------|------|
| **app** | Nginx + Go 二进制文件（单镜像） | 80（对外） |
| **postgres** | PostgreSQL 16 | 5432（内部） |

根目录的 `Dockerfile` 使用多阶段构建：
1. **frontend-builder** — Node 24，`npm ci && npm run build` → `dist/`
2. **backend-builder** — Go 1.25，`go build` → 二进制文件
3. **final** — Nginx Alpine + Go 二进制文件 + 入口脚本

## ModelScope 独立部署

对于 ModelScope Studios 等单容器平台，Dockerfile 也支持内嵌 PostgreSQL：

```bash
docker build -t momshell .
docker run -d -p 7860:7860 --env-file .env momshell
```

入口脚本（`deploy/entrypoint.sh`）在未配置外部数据库时会自动初始化 PostgreSQL（initdb、创建用户/数据库）。在此模式下 Nginx 监听端口 7860。

## Make 命令

```bash
make docker-build    # 构建 Docker 镜像
make docker-up       # 启动所有服务（app + postgres）
make docker-down     # 停止所有服务
make docker-logs     # 查看日志
```

## 配置

部署所需的关键环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | `postgres://momshell:momshell@postgres:5432/momshell?sslmode=disable` |
| `POSTGRES_USER` | PostgreSQL 容器用户（默认：momshell） |
| `POSTGRES_PASSWORD` | PostgreSQL 容器密码（默认：momshell） |
| `POSTGRES_DB` | PostgreSQL 容器数据库（默认：momshell） |
| `JWT_SECRET_KEY` | 安全随机密钥 |
| `OPENAI_API_KEY` | LLM API 密钥 |
| `PORT` | 后端服务器端口（默认：8000，内部使用） |

Docker 环境下不需要 `VITE_API_BASE_URL` — Nginx 在同一容器内将 `/api/` 代理到后端。

完整参考请参阅[配置说明](configuration.md)。

## 数据持久化

PostgreSQL 数据存储在 Docker 命名卷 `pgdata` 中。如需重置：

```bash
make docker-down
docker volume rm deploy_pgdata
make docker-up
```

---

[返回文档索引](README.md) | [返回主 README](../../README.md)
