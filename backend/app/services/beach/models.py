"""Beach module SQLAlchemy models for Shell Beach system."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import BottleStatus, MemoryInjectionStatus, ShellStatus, ShellType


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid4())


def generate_shell_code() -> str:
    """Generate a unique shell code for pairing."""
    import secrets

    return secrets.token_urlsafe(6)  # Short, URL-safe code


# ============================================================
# Shell - Core entity representing items on the beach
# ============================================================


class Shell(Base):
    """Shell entity - represents memories (mom) or tasks (dad) on the beach."""

    __tablename__ = "shells"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Shell type and status
    shell_type: Mapped[ShellType] = mapped_column(
        SAEnum(ShellType), default=ShellType.MEMORY, index=True
    )
    status: Mapped[ShellStatus] = mapped_column(
        SAEnum(ShellStatus), default=ShellStatus.DUSTY, index=True
    )

    # Content
    title: Mapped[str] = mapped_column(String(200))  # Memory title or task name
    content: Mapped[str | None] = mapped_column(Text, nullable=True)  # Detailed description
    memory_tag: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # Selected tag (e.g., "旧磁带")

    # Associated sticker (after AI generation)
    sticker_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("stickers.id", ondelete="SET NULL"), nullable=True
    )

    # For task shells - link to task template
    task_template_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("task_templates.id", ondelete="SET NULL"), nullable=True
    )

    # For gift shells - link to memory injection
    memory_injection_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("memory_injections.id", ondelete="SET NULL"), nullable=True
    )

    # Position on beach (for visual arrangement)
    position_x: Mapped[float | None] = mapped_column(Integer, nullable=True)  # 0-100
    position_y: Mapped[float | None] = mapped_column(Integer, nullable=True)  # 0-100

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    sticker: Mapped["Sticker | None"] = relationship("Sticker", back_populates="shell")


# ============================================================
# Sticker - AI-generated images representing memories
# ============================================================


class Sticker(Base):
    """AI-generated sticker representing a memory."""

    __tablename__ = "stickers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Generation details
    prompt: Mapped[str] = mapped_column(Text)  # Prompt used for generation
    style: Mapped[str] = mapped_column(String(50), default="sticker")  # Generation style
    memory_text: Mapped[str] = mapped_column(Text)  # Original memory description

    # Generated images
    image_url: Mapped[str] = mapped_column(String(500))  # Full image URL
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metadata
    generation_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    generation_status: Mapped[str] = mapped_column(
        String(20), default="completed"
    )  # pending, completed, failed

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship("User")
    shell: Mapped["Shell | None"] = relationship("Shell", back_populates="sticker")


# ============================================================
# DriftBottle - Wishes sent from mom to dad
# ============================================================


class DriftBottle(Base):
    """Drift bottle containing a wish from mom to dad."""

    __tablename__ = "drift_bottles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    receiver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Wish content
    wish_content: Mapped[str] = mapped_column(Text)

    # Status
    status: Mapped[BottleStatus] = mapped_column(
        SAEnum(BottleStatus), default=BottleStatus.DRIFTING, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    caught_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Mom confirmation
    mom_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped["User | None"] = relationship("User", foreign_keys=[receiver_id])
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


# ============================================================
# MemoryInjection - Memories/gifts from dad to mom
# ============================================================


class MemoryInjection(Base):
    """Memory or gift injected by dad for mom to discover."""

    __tablename__ = "memory_injections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Content
    content_type: Mapped[str] = mapped_column(String(20))  # text, photo
    content: Mapped[str] = mapped_column(Text)  # Text content or photo URL
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Generated sticker (optional)
    sticker_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("stickers.id", ondelete="SET NULL"), nullable=True
    )

    # Status
    status: Mapped[MemoryInjectionStatus] = mapped_column(
        SAEnum(MemoryInjectionStatus), default=MemoryInjectionStatus.PENDING, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship("User", foreign_keys=[receiver_id])
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")
    sticker: Mapped["Sticker | None"] = relationship("Sticker")


# ============================================================
# UserShellCode - Shell code for pairing
# ============================================================


class UserShellCode(Base):
    """User's unique shell code for pairing."""

    __tablename__ = "user_shell_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Shell code (unique identifier for pairing)
    shell_code: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, default=generate_shell_code
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User")


# Import for relationship type hints
from app.services.community.models import User  # noqa: E402, F401
from app.services.guardian.models import PartnerBinding  # noqa: E402, F401
