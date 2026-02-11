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

from .enums import (
    AudioType,
    MemoirStatus,
    MemoryStatus,
    NotificationType,
    SceneCategory,
    ShellStatus,
    ShellType,
    StickerStyle,
    TagType,
    WishStatus,
    WishType,
)


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

    # Status for async generation
    status: Mapped[MemoirStatus] = mapped_column(
        SAEnum(MemoirStatus), default=MemoirStatus.COMPLETED
    )
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Rating
    user_rating: Mapped[float | None] = mapped_column(Float, nullable=True)  # 1-5

    # Reveal tracking (for Memory Pool)
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User")


# ============================================================
# Dad Mode 2.0: Task Shells
# ============================================================


class EchoTaskShell(Base):
    """Task shells on dad's beach that need washing."""

    __tablename__ = "echo_task_shells"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Shell type
    shell_type: Mapped[ShellType] = mapped_column(
        SAEnum(ShellType), default=ShellType.NORMAL
    )

    # Status flow: muddy → washing → washed → opened → archived
    status: Mapped[ShellStatus] = mapped_column(
        SAEnum(ShellStatus), default=ShellStatus.MUDDY, index=True
    )

    # Task source tracking
    creator_role: Mapped[str] = mapped_column(
        String(20), default="system"
    )  # "system", "dad", "mom", "wish"

    # Link to Guardian's TaskTemplate (for system tasks)
    template_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("task_templates.id", ondelete="SET NULL"), nullable=True
    )

    # Custom task content (for wish/mom-created tasks)
    custom_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    custom_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Wish bottle reference (if from wish)
    wish_bottle_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("echo_wish_bottles.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Memory Pool binding
    bound_memoir_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("echo_youth_memoirs.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Memory sticker revealed upon washing
    memory_sticker_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    memory_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Confirmation status (for mom-created tasks)
    confirmation_status: Mapped[str] = mapped_column(
        String(20), default="confirmed"
    )  # "pending", "accepted", "rejected"

    # Washing timestamps
    washing_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    washed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")
    template: Mapped["TaskTemplate | None"] = relationship("TaskTemplate")
    wish_bottle: Mapped["EchoWishBottle | None"] = relationship(
        "EchoWishBottle", foreign_keys=[wish_bottle_id]
    )
    bound_memoir: Mapped["EchoYouthMemoir | None"] = relationship("EchoYouthMemoir")


# ============================================================
# Dad Mode 2.0: Wish Bottles
# ============================================================


class EchoWishBottle(Base):
    """Mom's wishes drifting to dad."""

    __tablename__ = "echo_wish_bottles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Wish content
    wish_type: Mapped[WishType] = mapped_column(SAEnum(WishType))
    content: Mapped[str] = mapped_column(Text)  # Mom's wish text
    emoji_hint: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # Optional emoji

    # Status flow: drifting → caught → in_progress → granted
    status: Mapped[WishStatus] = mapped_column(
        SAEnum(WishStatus), default=WishStatus.DRIFTING, index=True
    )

    # Catch info
    caught_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Resulting task shell (when caught)
    resulting_shell_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("echo_task_shells.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Completion
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Mom's confirmation (emoji reaction)
    mom_reaction: Mapped[str | None] = mapped_column(String(20), nullable=True)  # emoji

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")
    resulting_shell: Mapped["EchoTaskShell | None"] = relationship(
        "EchoTaskShell", foreign_keys=[resulting_shell_id]
    )


# ============================================================
# Dad Mode 2.0: Memory Shells
# ============================================================


class EchoMemoryShell(Base):
    """Dad's memory shells for mom."""

    __tablename__ = "echo_memory_shells"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Creator (dad)
    creator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Memory content
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI sticker generation
    sticker_style: Mapped[StickerStyle] = mapped_column(SAEnum(StickerStyle))
    sticker_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Status flow: generating → ready → opened → favorited
    status: Mapped[MemoryStatus] = mapped_column(
        SAEnum(MemoryStatus), default=MemoryStatus.GENERATING, index=True
    )

    # Reveal tracking
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    mom_reaction: Mapped[str | None] = mapped_column(String(20), nullable=True)  # emoji

    # Error tracking for AI generation
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")
    creator: Mapped["User"] = relationship("User")


# ============================================================
# Dad Mode 2.0: Notifications
# ============================================================


class EchoNotification(Base):
    """Notification system for Echo Domain."""

    __tablename__ = "echo_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Notification type
    notification_type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType), index=True
    )

    # Title and message
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)

    # Link to related entities
    related_entity_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # "wish_bottle", "memory_shell", "task_shell"
    related_entity_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )  # ID of the related entity

    # Read status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User")


# Import for relationship type hints
from app.services.community.models import User  # noqa: E402, F401
from app.services.guardian.models import (  # noqa: E402, F401
    PartnerBinding,
    TaskTemplate,
)
