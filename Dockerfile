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
# Stage 2: 系统库安装 (绕过 apt 缓存空间限制)
# ==========================================
FROM python:3.11-slim-bookworm AS lib-builder

# 直接下载 deb 包并安装，绕过 apt 缓存
RUN apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::AllowInsecureRepositories=true && \
    cd /tmp && \
    apt-get download --allow-unauthenticated libglib2.0-0 libgomp1 libxcb1 libxau6 libxdmcp6 libbsd0 libmd0 && \
    dpkg -i *.deb || true && \
    rm -rf /var/lib/apt/lists/* /tmp/*.deb

# ==========================================
# Stage 3: 后端运行 (Backend Runtime)
# ==========================================
FROM python:3.11-slim-bookworm

# 环境变量设置
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MPLCONFIGDIR=/tmp/matplotlib \
    DATABASE_URL=sqlite+aiosqlite:////mnt/workspace/momshell.db

WORKDIR /app

# 从 lib-builder 复制系统库
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libglib* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libgthread* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libgobject* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libgio* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libgmodule* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libgomp* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libxcb* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libXau* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libXdmcp* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libbsd* /usr/lib/x86_64-linux-gnu/
COPY --from=lib-builder /usr/lib/x86_64-linux-gnu/libmd* /usr/lib/x86_64-linux-gnu/

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 替换 OpenCV 为 headless 版本（不需要 libGL/X11 系统库，节省 200MB+）
RUN pip install --no-cache-dir --force-reinstall \
    opencv-python-headless==4.13.0.90 \
    opencv-contrib-python-headless==4.13.0.90 \
    -i https://mirrors.aliyun.com/pypi/simple/

# 复制后端代码
COPY backend/app/ /app/app/

# 创建数据目录和模型目录
RUN mkdir -p /app/data /app/models

# 预下载 MediaPipe LITE 模型（更快，适合低配服务器）
# 添加重试逻辑，避免网络不稳定导致构建失败
RUN python3 << 'PYEOF'
import urllib.request, time
url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
path = "/app/models/pose_landmarker_lite.task"
for i in range(5):
    try:
        urllib.request.urlretrieve(url, path)
        print("Downloaded successfully")
        break
    except Exception as e:
        print(f"Attempt {i+1} failed: {e}")
        if i < 4:
            time.sleep(3 * (i + 1))
else:
    raise Exception("Failed to download after 5 attempts")
PYEOF

# 从 Stage 1 复制前端静态文件
# Next.js export 输出在 out 目录
COPY --from=frontend-builder /build_frontend/out /app/frontend_dist

# 暴露端口
EXPOSE 7860

# 启动命令 - 必须监听 0.0.0.0:7860
CMD ["python", "-m", "app.main"]
