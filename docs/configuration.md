# Configuration

Environment variables for configuring MomShell.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MODELSCOPE_KEY` | ModelScope API key for AI services | **Yes** | - |
| `MODELSCOPE_MODEL` | Model name for chat and feedback | No | `Qwen/Qwen2.5-72B-Instruct` |
| `DATABASE_URL` | Database connection URL | No | `sqlite+aiosqlite:///./data/momshell.db` |
| `PORT` | Server port (Docker sets 7860) | No | `8000` (local) / `7860` (Docker) |
| `DEBUG` | Enable debug mode | No | `false` |
| `MEDIAPIPE_MODEL` | Pose detection model (`lite` or `full`) | No | `lite` |
| `MIN_TRACKING_CONFIDENCE` | MediaPipe tracking confidence | No | `0.3` |
| `TTS_VOICE` | Microsoft Edge TTS voice | No | `zh-CN-XiaoxiaoNeural` |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web search | No | - |

## Setup

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` and fill in required values:

```bash
# Required
MODELSCOPE_KEY=your_api_key_here

# Optional - customize as needed
MODELSCOPE_MODEL=Qwen/Qwen2.5-72B-Instruct
TTS_VOICE=zh-CN-XiaoxiaoNeural
```

## Important Notes

- **Do not use quotes** around values in `.env` - Docker `--env-file` includes quotes literally
- `MODELSCOPE_KEY` is required for Soul Companion and Recovery Coach features
- `FIRECRAWL_API_KEY` is optional but enables web search for fact-checked responses
- For Docker deployment, leave `PORT` unset or commented out to use the default 7860

## MediaPipe Configuration

| Model | Use Case |
|-------|----------|
| `lite` | Default. Better performance on low-end servers |
| `full` | Higher accuracy, more resource intensive |

```bash
MEDIAPIPE_MODEL=lite
MIN_TRACKING_CONFIDENCE=0.3
```

## TTS Voice Options

Common Chinese voices:
- `zh-CN-XiaoxiaoNeural` (default, female)
- `zh-CN-YunxiNeural` (male)
- `zh-CN-YunyangNeural` (male, news style)

See [Edge TTS documentation](https://github.com/rany2/edge-tts) for all available voices.

---

[Back to Documentation Index](README.md) | [Back to main README](../README.md)
