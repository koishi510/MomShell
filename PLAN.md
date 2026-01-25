# 🚀 部署计划：魔搭社区 (ModelScope) Docker 方案

**项目架构**: 前后端分离 (Frontend + Backend)
**技术栈**: Python (uv) + Node.js (nvm)
**目标**: 构建单体 Docker 镜像，合并静态资源，监听 `0.0.0.0:7860`。

---

## 📅 Phase 1: 依赖标准化 (Local Pre-processing)

_目标：准备构建所需的精确依赖列表。_

- [ ] **1.1 生成后端依赖清单 (`requirements.txt`)**
      由于 Docker 基础镜像不包含 uv，需导出标准 pip 格式文件。

  ```bash
  # 进入项目根目录执行
  uv pip compile pyproject.toml -o requirements.txt
  # 或者: uv pip freeze > requirements.txt
  ```

- [ ] **1.2 确认前端 Node 版本**
      检查 `/frontend` 目录下的配置，确定构建镜像的基础 tag。
  ```bash
  cat frontend/.nvmrc || grep '"node":' frontend/package.json
  # 记下版本号 (如 18, 20)
  ```

---

## 🛠 Phase 2: 代码逻辑适配 (Code Modification)

_目标：让 Python 后端能够托管前端构建后的静态文件。_

- [ ] **2.1 修改 `app/main.py` 挂载静态文件**
      修改 Python 入口文件，增加对 `/app/static` 目录的托管逻辑。

  **FastAPI 示例:**

  ```python
  from fastapi.staticfiles import StaticFiles
  from fastapi.responses import FileResponse
  import os

  # ... app 定义 ...

  # 确保在 API 路由定义之后
  if os.path.exists("static"):
      app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

      # SPA 路由兜底 (所有未匹配路径返回 index.html)
      @app.get("/{full_path:path}")
      async def serve_spa(full_path: str):
          file_path = os.path.join("static", full_path)
          if os.path.exists(file_path) and os.path.isfile(file_path):
              return FileResponse(file_path)
          return FileResponse("static/index.html")
  ```

- [ ] **2.2 检查前端 API Base URL**
      检查前端代码（如 `.env` 或 `axios` 配置），确保 API 请求使用**相对路径**。
  - ❌ `http://localhost:8000/api/predict`
  - ✅ `/api/predict`

---

## 🐳 Phase 3: Dockerfile 编写

_目标：在根目录创建多阶段构建文件。_

- [ ] **3.1 创建 `Dockerfile`**
      请根据 Phase 1 确认的 Node 版本调整 `FROM` 语句。

```dockerfile
# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: 前端构建 (Frontend Builder)
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /build_frontend

# 1. 安装依赖 (利用缓存)
COPY frontend/package*.json ./
RUN npm install

# 2. 复制代码并构建
COPY frontend/ ./
# 注意：确保 build 输出目录是 dist 或 build，下文需对应修改
RUN npm run build

# ==========================================
# Stage 2: 后端运行 (Backend Runtime)
# ==========================================
FROM python:3.9-slim
WORKDIR /app

# 环境变量设置
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 1. 安装 Python 依赖
COPY requirements.txt .
# 使用阿里云镜像源加速
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 2. 复制后端代码
COPY app/ /app

# 3. 【核心】从 Stage 1 复制前端静态文件
# 假设前端构建输出在 dist 目录，将其复制为 /app/static
COPY --from=frontend-builder /build_frontend/dist /app/static

# 4. 暴露端口 (魔搭社区强制要求)
EXPOSE 7860

# 5. 启动命令
# 必须监听 0.0.0.0
CMD ["python", "main.py"]
```

---

## ✅ Phase 4: 本地验证 (Verification)

_目标：确保推送到云端前，镜像能正常运行。_

- [ ] **4.1 构建镜像**

  ```bash
  docker build -t ms-deploy-test .
  ```

- [ ] **4.2 运行测试**

  ```bash
  docker run --rm -p 7860:7860 ms-deploy-test
  ```

- [ ] **4.3 验证点**
  1. 打开浏览器访问 `http://localhost:7860` -> 应显示前端页面。
  2. 测试功能交互 -> 前端应能成功调用后端 API。

---

## 🚀 Phase 5: 部署 (Deployment)

_目标：推送到魔搭社区仓库。_

- [ ] **5.1 准备 `.gitignore`**
      确保**不**忽略 `Dockerfile` 和 `requirements.txt`。
      确保**忽略** `frontend/node_modules`, `frontend/dist`, `__pycache__`。

- [ ] **5.2 推送代码**

  ```bash
  git add Dockerfile requirements.txt app/ frontend/
  git commit -m "feat: dockerize app with uv backend and nvm frontend"
  git push
  ```

- [ ] **5.3 监控构建**
      前往魔搭社区“创空间”页面 -> “构建日志”查看进度。

```

```
