# 快速开始

## 前置要求

- [Go 1.25+](https://go.dev/dl/)
- [Node.js 24+](https://nodejs.org/)（或通过 [nvm](https://github.com/nvm-sh/nvm) 安装）
- [PostgreSQL](https://www.postgresql.org/)
- Git

## 快速安装

```bash
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh
```

安装脚本会执行以下操作：
- 检查前置依赖（Go、Node、npm、git）
- 从模板创建 `.env` 文件，并自动生成 JWT 密钥
- 下载 Go 依赖
- 安装 npm 包
- 安装 pre-commit 钩子

## 启动应用

```bash
make dev-backend    # 终端 1 — http://localhost:8000
make dev-frontend   # 终端 2 — http://localhost:5173

# 或使用 tmux
make dev-tmux
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:8000 |
| 管理面板 | http://localhost:8000/admin |

## 创建管理员账户

在首次启动前，在 `.env` 中设置以下变量：

```
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

或在登录后通过管理面板创建额外的管理员。

## 下一步

- [配置环境变量](configuration.md)
- [了解功能特性](features.md)
- [使用 Docker 部署](deployment.md)

---

[返回文档索引](README.md) | [返回主 README](../../README.md)
