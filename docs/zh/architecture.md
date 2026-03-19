# 架构设计

MomShell 技术架构概览。

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| **Go 1.25** | 后端语言 |
| **Gin** | HTTP 框架 |
| **GORM** | ORM（PostgreSQL） |
| **pgvector** | 向量相似性搜索（Deep RAG） |
| **JWT (golang-jwt)** | 认证（httpOnly cookies） |
| **OpenAI SDK** | LLM 集成（Qwen / 任意 OpenAI 兼容模型） |
| **Firecrawl** | 网络搜索，用于 AI 回复的事实依据 |
| **go:embed** | 内嵌管理面板 |

### 前端

| 技术 | 用途 |
|------|------|
| **Vue 3** | UI 框架 |
| **Vite 8** | 构建工具 |
| **TypeScript** | 类型安全 |
| **Pinia** | 状态管理 |
| **Axios** | HTTP 客户端 |
| **GSAP** | 动画 |
| **Three.js** | 3D 图形 |
| **MediaPipe** | 手势检测 |

## 项目结构

```
MomShell/
├── backend/                    # Go 后端
│   ├── cmd/server/main.go      # 入口 & 依赖注入
│   ├── internal/
│   │   ├── admin/              # 内嵌管理面板（go:embed HTML）
│   │   ├── config/             # 环境配置加载器
│   │   ├── database/           # 数据库连接 & 自动迁移
│   │   ├── dto/                # 请求/响应数据传输对象
│   │   ├── fileutil/           # 共享文件工具（删除辅助）
│   │   ├── handler/            # HTTP 处理器（Gin）
│   │   ├── middleware/         # 认证、CORS、恢复、限流
│   │   ├── model/              # GORM 模型（User, Task, Achievement, PerkCard,
│   │   │                       #   FutureLetter, RAGDocument, ChatMemory 等）
│   │   ├── repository/         # 数据访问层
│   │   ├── router/             # 路由注册
│   │   ├── scheduler/          # 后台任务调度（照片清理）
│   │   └── service/            # 业务逻辑
│   └── pkg/
│       ├── firecrawl/          # 网络搜索 API 客户端
│       ├── jwt/                # JWT 生成 & 验证
│       ├── openai/             # OpenAI 兼容客户端
│       └── password/           # bcrypt 哈希
│
├── frontend/                   # Vue 3 前端
│   └── src/
│       ├── assets/
│       │   ├── audio/          # 背景音乐
│       │   └── images/         # 场景精灵图、图标、背景
│       ├── components/
│       │   ├── dad/            # 爸爸控制台模块（DadConsole, DcHome, DcChat,
│       │   │                   #   DcCommunity, DcDashboard, DcTaskList, DcTaskCard,
│       │   │                   #   DcWhisper, DcProfile, DcAiMemory, DcHeader, DcTabBar,
│       │   │                   #   DcAgePicker, DcMemoryCardDialog）
│       │   ├── overlay/        # UI 面板（Auth, Chat, Community, AiMemory, Bar, Car,
│       │   │                   #   Whisper, Task, Profile, RoleSelect, AnimeLanding,
│       │   │                   #   NeutralLanding, ConfirmDialog）
│       │   ├── react/          # React 组件（PearlShell 3D 场景）
│       │   ├── task/           # 任务仪表盘视觉效果（技能雷达等）
│       │   └── scene/          # 海滩场景图层（天空、海洋、沙滩等）
│       ├── composables/        # Vue 组合式函数（动画、视差、波浪、音乐、
│       │                       #   移动端检测、教程、输入处理）
│       ├── constants/          # 场景配置
│       ├── lib/
│       │   ├── api/            # API 模块（chat, community, echo, photo, task,
│       │   │                   #   perkCard, user, whisper）
│       │   ├── apiClient.ts    # 带 JWT 拦截器的 Axios 实例
│       │   └── auth.ts         # 原始 fetch 认证调用（注册、登录、刷新）
│       ├── stores/             # Pinia 状态库（auth, UI）
│       ├── styles/             # CSS 样式
│       ├── types/              # TypeScript 类型定义
│       └── utils/              # 共享工具函数
│
├── deploy/                     # Docker Compose + Nginx 配置
├── docs/                       # 文档
├── scripts/                    # 开发设置脚本
├── .env.example                # 环境变量模板
├── Makefile                    # 构建 & 开发命令
└── .pre-commit-config.yaml     # Git 钩子
```

## 架构层级

```
Handler（HTTP）→ Service（业务逻辑）→ Repository（数据访问）→ GORM → PostgreSQL
```

- **Handler**：解析 HTTP 请求、验证输入、调用服务、返回 JSON
- **Service**：业务规则、权限检查、横切关注点
- **Repository**：通过 GORM 执行数据库查询，不含业务逻辑
- **Model**：包含表映射和关系的 GORM 结构体
- **DTO**：请求/响应类型，与模型解耦

## 关键设计决策

### 内嵌管理面板

管理面板是一个单 HTML 文件（`internal/admin/admin.html`），使用 Tailwind CSS CDN 和 Alpine.js。通过 `go:embed` 嵌入到 Go 二进制文件中，无需单独的前端构建或部署。

### 认证

- JWT 访问令牌（30 分钟）+ 刷新令牌（7 天），存储在 httpOnly cookies 中
- 从 `Authorization: Bearer`、`X-Access-Token` 请求头或 `access_token` cookie 中提取令牌
- 在 handler 中通过 `authService.GetUserByID` 逐请求验证管理员角色
- 对所有 API 端点实施固定窗口限流

### AI 伙伴记忆

心灵伙伴的三阶段记忆系统：

1. **对话轮次** — 原始的用户/助手对话交换，以 JSON 形式存储在 `ChatMemory.ConversationTurns` 中
2. **对话摘要** — 当轮次超过 20 条时自动生成摘要；保留最近 15 条轮次 + 压缩摘要
3. **结构化记忆事实** — `ChatMemoryFact` 模型，带有分类标签（家庭、兴趣、关注、个人信息、偏好、其他）；从 AI 回复中自动提取并去重

基于角色的系统提示词会为妈妈、爸爸和专业用户调整语调。

### 内容审核

- 基于关键词的检测，分类包括：伪科学、暴力、自残、垃圾信息
- 危机关键词触发自动拒绝
- 审核结果：通过 / 拒绝 / 需人工审核

### Deep RAG

使用 pgvector 的语义检索增强生成：

- 文档被分块并通过 ModelScope 托管的嵌入模型生成向量
- 嵌入向量使用 pgvector 扩展存储在 PostgreSQL 中（`RAGDocument` 模型）
- 查询时，向量相似性搜索检索相关片段，为 AI 回复提供事实依据

### 未来信件

替代了贝壳礼物系统，改为时空关怀引擎：

- 任务完成时触发 AI 生成的未来信件，包含上下文感知的时间相关消息
- `FutureLetter` 模型存储信件内容、投递时间和任务关联
- 妈妈随时间收到有意义的信件，而非一次性盲盒礼物

### 部署模式

- **Docker Compose**：Nginx + Go + PostgreSQL 作为独立容器，端口 80
- **ModelScope 独立部署**：单容器内嵌 PostgreSQL，nginx 监听端口 7860，通过入口脚本自动初始化

## 数据流

```
前端（Vue 3 / Vite 8）
    ↕ REST API（JSON）
后端（Go / Gin）
    ↕ GORM
PostgreSQL + pgvector
    ↕ HTTP
OpenAI 兼容 LLM + ModelScope Embeddings
```

---

[返回文档索引](README.md) | [返回主 README](../../README.md)
