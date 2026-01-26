"""Application configuration."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
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


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
