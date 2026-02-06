# Configuration

Environment variables for configuring MomShell.

## Environment Variables

### Core Settings

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `APP_NAME` | Application name | No | `MomShell` |
| `DEBUG` | Enable debug mode | No | `false` |
| `HOST` | Server host | No | `0.0.0.0` |
| `PORT` | Server port | No | `8000` (local) / `7860` (Docker) |

### Database

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection URL | No | `sqlite+aiosqlite:///./data/momshell.db` |

Supported formats:
- SQLite (local): `sqlite+aiosqlite:///./data/momshell.db`
- SQLite (Docker): `sqlite+aiosqlite:////mnt/workspace/momshell.db`
- PostgreSQL: `postgresql+asyncpg://user:pass@host:5432/dbname`

### AI Services (ModelScope)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MODELSCOPE_KEY` | ModelScope API key | **Yes** | - |
| `MODELSCOPE_MODEL` | Model for chat and feedback | No | `Qwen/Qwen2.5-72B-Instruct` |
| `MODELSCOPE_IMAGE_MODEL` | Model for image generation | No | - |

Get your API key from: https://modelscope.cn/

### MediaPipe (Pose Detection)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MEDIAPIPE_MODEL` | Pose model type (`lite` or `full`) | No | `lite` |
| `POSE_MODEL_COMPLEXITY` | Model complexity (0-2) | No | `1` |
| `MIN_DETECTION_CONFIDENCE` | Detection confidence threshold | No | `0.5` |
| `MIN_TRACKING_CONFIDENCE` | Tracking confidence threshold | No | `0.3` |

### TTS (Text-to-Speech)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TTS_VOICE` | Microsoft Edge TTS voice | No | `zh-CN-XiaoxiaoNeural` |
| `TTS_RATE` | Speech rate adjustment | No | `-10%` |

Common Chinese voices:
- `zh-CN-XiaoxiaoNeural` (default, female)
- `zh-CN-YunxiNeural` (male)
- `zh-CN-YunyangNeural` (male, news style)

See [Edge TTS documentation](https://github.com/rany2/edge-tts) for all available voices.

### Safety Thresholds

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MAX_DEVIATION_ANGLE` | Maximum allowed pose deviation (degrees) | No | `30.0` |
| `FATIGUE_DETECTION_THRESHOLD` | Fatigue detection sensitivity | No | `0.7` |
| `REST_PROMPT_INTERVAL` | Interval between rest prompts (seconds) | No | `300` |

### JWT Authentication

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT signing | **Yes** (production) | `your-secret-key-change-in-production` |
| `JWT_ALGORITHM` | JWT signing algorithm | No | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiration | No | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiration | No | `7` |

**Important**: Change `JWT_SECRET_KEY` to a secure random value in production.

### Web Search (Firecrawl)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FIRECRAWL_API_KEY` | Firecrawl API key for web search | No | - |

Enables web search for fact-checked responses. Get your API key from: https://www.firecrawl.dev/

### Initial Admin Account

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ADMIN_USERNAME` | Admin username | No | - |
| `ADMIN_EMAIL` | Admin email | No | - |
| `ADMIN_PASSWORD` | Admin password | No | - |

Set these to automatically create an admin account on first startup.

## Setup

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in required values:

```bash
# Required
MODELSCOPE_KEY=your_modelscope_api_key_here

# Required for production
JWT_SECRET_KEY=your_secure_random_secret_key

# Optional - customize as needed
MODELSCOPE_MODEL=Qwen/Qwen2.5-72B-Instruct
TTS_VOICE=zh-CN-XiaoxiaoNeural
```

## Important Notes

- **Do not use quotes** around values in `.env` - Docker `--env-file` includes quotes literally
- `MODELSCOPE_KEY` is required for Soul Companion and Recovery Coach features
- For Docker deployment, leave `PORT` unset or commented out to use the default 7860
- Always change `JWT_SECRET_KEY` in production environments

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
