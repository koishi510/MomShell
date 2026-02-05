"""Application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file() -> str | None:
    """Find .env file, checking multiple locations for Docker compatibility."""
    # In Docker: /app/app/core/config.py -> parents[3] = /
    # In local dev: backend/app/core/config.py -> parents[3] = project root
    config_path = Path(__file__).resolve()

    # Try project root (local dev: backend/app/core/config.py)
    project_root = config_path.parents[3] / ".env"
    if project_root.exists():
        return str(project_root)

    # In Docker, env vars are passed via --env-file, no file needed
    return None


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "MomShell"
    debug: bool = False

    # Database (use /app/data for Docker)
    database_url: str = "sqlite+aiosqlite:///./data/momshell.db"

    # ModelScope API Configuration
    modelscope_key: str = ""
    modelscope_base_url: str = "https://api-inference.modelscope.cn/v1"
    modelscope_image_base_url: str = "https://api-inference.modelscope.cn/"
    modelscope_model: str = "Qwen/Qwen2.5-72B-Instruct"
    modelscope_image_model: str = ""

    # MediaPipe Configuration
    pose_model_complexity: int = 1  # 0, 1, or 2
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.3  # Lowered to reduce re-detection frequency

    # TTS Configuration
    tts_voice: str = "zh-CN-XiaoxiaoNeural"
    tts_rate: str = "-10%"

    # Safety thresholds
    max_deviation_angle: float = 30.0  # degrees
    fatigue_detection_threshold: float = 0.7
    rest_prompt_interval: int = 300  # seconds

    # JWT Authentication
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Web Search (Firecrawl API for reducing AI hallucinations)
    firecrawl_api_key: str = ""

    # Initial Admin Account (created on first startup if set)
    admin_username: str = ""
    admin_email: str = ""
    admin_password: str = ""


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
