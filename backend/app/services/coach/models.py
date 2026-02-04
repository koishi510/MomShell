"""Coach module database models."""

import json
from datetime import datetime
from typing import Any, cast

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def generate_uuid() -> str:
    """Generate a UUID string."""
    import uuid

    return str(uuid.uuid4())


class CoachProgress(Base):
    """Store coach progress data for authenticated users."""

    __tablename__ = "coach_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Progress data (JSON) - stores UserProgress structure
    progress_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def get_progress(self) -> dict[str, Any] | None:
        """Get progress as dict."""
        if self.progress_data:
            return cast(dict[str, Any], json.loads(self.progress_data))
        return None

    def set_progress(self, progress: dict[str, Any]) -> None:
        """Set progress from dict."""
        self.progress_data = json.dumps(progress, ensure_ascii=False)
