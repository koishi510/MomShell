"""Chat module database models."""

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


class ChatMemory(Base):
    """Store chat memory and profile for authenticated users."""

    __tablename__ = "chat_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # User profile (JSON)
    profile_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Conversation turns (JSON array)
    conversation_turns: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def get_profile(self) -> dict[str, Any]:
        """Get profile as dict."""
        if self.profile_data:
            return cast(dict[str, Any], json.loads(self.profile_data))
        return {}

    def set_profile(self, profile: dict[str, Any]) -> None:
        """Set profile from dict."""
        self.profile_data = json.dumps(profile, ensure_ascii=False)

    def get_turns(self) -> list[dict[str, Any]]:
        """Get conversation turns as list."""
        if self.conversation_turns:
            return cast(list[dict[str, Any]], json.loads(self.conversation_turns))
        return []

    def set_turns(self, turns: list[dict[str, Any]]) -> None:
        """Set conversation turns from list."""
        self.conversation_turns = json.dumps(turns, ensure_ascii=False)
