# syntax=docker/dockerfile:1
# =============================================================================
# MomShell - ModelScope Deploy (Single Container)
# =============================================================================
# 前后端合并部署，监听 0.0.0.0:7860
# =============================================================================

# ==========================================
# Stage 1: 前端构建 (Frontend Builder)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /build_frontend

# 安装依赖 (利用缓存)
COPY frontend/package*.json ./
RUN npm install

# 复制代码并构建
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: 后端运行 (Backend Runtime)
# ==========================================
FROM python:3.11-slim-bookworm

# 环境变量设置
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

# 安装系统依赖 (MediaPipe/OpenCV需要)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 复制后端代码
COPY app/ /app/app/

# 创建数据目录
RUN mkdir -p /app/data

# 从 Stage 1 复制前端静态文件
# Next.js export 输出在 out 目录
COPY --from=frontend-builder /build_frontend/out /app/frontend_dist

# 暴露端口
EXPOSE 7860

# 启动命令 - 必须监听 0.0.0.0:7860
CMD ["python", "-m", "app.main"]
