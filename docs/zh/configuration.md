# 配置说明

MomShell 的环境变量配置。将 `.env.example` 复制为 `.env` 并编辑。

## 数据库

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | **是** | — |

格式：`postgres://user:password@host:5432/dbname?sslmode=disable`

## JWT 认证

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `JWT_SECRET_KEY` | JWT 签名密钥 | **是** | — |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌有效期 | 否 | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌有效期 | 否 | `7` |

安装脚本会自动生成 `JWT_SECRET_KEY`。在生产环境中请手动更换。

## OpenAI 兼容 API

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `OPENAI_API_KEY` | LLM 服务 API 密钥 | **是** | — |
| `OPENAI_BASE_URL` | API 基础 URL | 否 | `https://api-inference.modelscope.cn/v1` |
| `OPENAI_MODEL` | 模型名称 | 否 | `Qwen/Qwen3-235B-A22B` |
| `IMAGE_MODEL` | AI 图像生成模型 | 否 | `Tongyi-MAI/Z-Image-Turbo` |

支持任何 OpenAI 兼容的 API（ModelScope、OpenAI、本地 Ollama 等）。

## 网络搜索

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `FIRECRAWL_API_KEY` | Firecrawl API 密钥，用于网络搜索 | 否 | — |

设置后，AI 回复将使用网络搜索来减少事实性问题的幻觉。

## 服务器

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `PORT` | HTTP 服务器端口 | 否 | `8000` |

## 前端

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `VITE_API_BASE_URL` | 前端使用的后端 API 地址 | 否 | `http://localhost:8000` |

使用 Nginx 反向代理的生产环境中留空即可。

## 初始管理员账户

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `ADMIN_USERNAME` | 管理员用户名 | 否 | — |
| `ADMIN_EMAIL` | 管理员邮箱 | 否 | — |
| `ADMIN_PASSWORD` | 管理员密码 | 否 | — |

三项全部设置后，首次启动时将自动创建管理员。如果用户名或邮箱已存在则跳过。

## 运行时配置

以下配置也可以在运行时通过管理面板（`/admin` → 系统配置）修改：

- `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`、`JWT_REFRESH_TOKEN_EXPIRE_DAYS`

在管理面板中只读（需要重启）：`DATABASE_URL`、`JWT_ALGORITHM`、`PORT`。

---

[返回文档索引](README.md) | [返回主 README](../../README.md)
