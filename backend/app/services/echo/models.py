"""Echo Domain SQLAlchemy models."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import AudioType, SceneCategory, TagType


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid4())


# ============================================================
# Identity Tags (Mom's self-reflection labels)
# ============================================================


class EchoIdentityTag(Base):
    """Mom's identity tags for scene/audio matching."""

    __tablename__ = "echo_identity_tags"
    __table_args__ = (
        UniqueConstraint("user_id", "tag_type", "content", name="uq_echo_identity_tag"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    tag_type: Mapped[TagType] = mapped_column(SAEnum(TagType))
    content: Mapped[str] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User")


# ============================================================
# Scene Library (Preset scenes for meditation)
# ============================================================


class EchoSceneLibrary(Base):
    """Preset scene library for meditation visuals."""

    __tablename__ = "echo_scene_library"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Scene info
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Categorization
    category: Mapped[SceneCategory] = mapped_column(SAEnum(SceneCategory))
    keywords: Mapped[str] = mapped_column(Text)  # JSON array of keywords

    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# Audio Library (Preset audio for meditation)
# ============================================================


class EchoAudioLibrary(Base):
    """Preset audio library for meditation sounds."""

    __tablename__ = "echo_audio_library"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Audio info
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str] = mapped_column(String(500))
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Categorization
    audio_type: Mapped[AudioType] = mapped_column(SAEnum(AudioType))
    keywords: Mapped[str] = mapped_column(Text)  # JSON array of keywords

    # External source (e.g., freesound.org)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# Meditation Sessions (Mom's meditation records)
# ============================================================


class EchoMeditationSession(Base):
    """Mom's meditation session records."""

    __tablename__ = "echo_meditation_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Session settings
    target_duration_minutes: Mapped[int] = mapped_column(Integer)
    scene_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("echo_scene_library.id"), nullable=True
    )
    audio_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("echo_audio_library.id"), nullable=True
    )

    # Session results
    actual_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User")
    scene: Mapped["EchoSceneLibrary | None"] = relationship("EchoSceneLibrary")
    audio: Mapped["EchoAudioLibrary | None"] = relationship("EchoAudioLibrary")


# ============================================================
# Partner Memories (Injected by partner for mom)
# ============================================================


class EchoPartnerMemory(Base):
    """Memories injected by partner for mom to discover."""

    __tablename__ = "echo_partner_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Memory content
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Reveal condition (clarity level threshold)
    reveal_at_clarity: Mapped[int] = mapped_column(Integer, default=50)  # 0-100

    # Status
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    revealed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


# ============================================================
# Window Clarity (Partner's progress visualization)
# ============================================================


class EchoWindowClarity(Base):
    """Window clarity state for partner mode."""

    __tablename__ = "echo_window_clarity"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("partner_bindings.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    # Current clarity state (cached, recalculated on request)
    clarity_level: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    last_calculated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


# ============================================================
# Youth Memoirs (AI-generated memoirs for mom)
# ============================================================


class EchoYouthMemoir(Base):
    """AI-generated youth memoirs based on identity tags."""

    __tablename__ = "echo_youth_memoirs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Memoir content
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Generation metadata
    generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_used: Mapped[str] = mapped_column(Text)  # JSON array of tag IDs used

    # Rating
    user_rating: Mapped[float | None] = mapped_column(Float, nullable=True)  # 1-5

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User")


# Import for relationship type hints
from app.services.community.models import User  # noqa: E402, F401
from app.services.guardian.models import PartnerBinding  # noqa: E402, F401
