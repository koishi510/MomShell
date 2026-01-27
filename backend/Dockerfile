# syntax=docker/dockerfile:1
# =============================================================================
# MomShell Backend - Standalone Container
# =============================================================================

FROM python:3.11-slim-bookworm

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

# Install system dependencies (MediaPipe/OpenCV requirements)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgcc-s1 \
    libstdc++6 \
    libx11-6 \
    libxcb1 \
    libxau6 \
    libxdmcp6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/ /app/app/

# Create data and models directories
RUN mkdir -p /app/data /app/models

# Download MediaPipe LITE model with retry logic
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

EXPOSE 8000

CMD ["python", "-m", "app.main"]
