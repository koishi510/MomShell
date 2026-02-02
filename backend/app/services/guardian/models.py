"""Guardian module SQLAlchemy models."""

from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
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
    BindingStatus,
    MoodLevel,
    PartnerLevel,
    TaskDifficulty,
    TaskStatus,
)


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid4())


def generate_invite_code() -> str:
    """Generate a short invite code."""
    import secrets

    return secrets.token_urlsafe(8)


# ============================================================
# Partner Binding
# ============================================================


class PartnerBinding(Base):
    """Partner binding relationship between mom and partner."""

    __tablename__ = "partner_bindings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Mom and Partner IDs (reference users table)
    mom_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    partner_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Invitation
    invite_code: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, default=generate_invite_code
    )
    invite_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Status
    status: Mapped[BindingStatus] = mapped_column(
        SAEnum(BindingStatus), default=BindingStatus.PENDING
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    bound_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    unbound_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    mom: Mapped["User"] = relationship("User", foreign_keys=[mom_id])
    partner: Mapped["User | None"] = relationship("User", foreign_keys=[partner_id])


# ============================================================
# Mom Daily Status
# ============================================================


class MomDailyStatus(Base):
    """Mom's daily status record."""

    __tablename__ = "mom_daily_status"
    __table_args__ = (UniqueConstraint("mom_id", "date", name="uq_mom_daily_status"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    mom_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Date (only one record per day)
    date: Mapped[datetime] = mapped_column(Date, index=True)

    # Status data
    mood: Mapped[MoodLevel] = mapped_column(
        SAEnum(MoodLevel), default=MoodLevel.NEUTRAL
    )
    energy_level: Mapped[int] = mapped_column(Integer, default=50)  # 0-100
    health_conditions: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON array
    feeding_count: Mapped[int] = mapped_column(
        Integer, default=0
    )  # Night feeding count
    sleep_hours: Mapped[float | None] = mapped_column(Integer, nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Partner notification
    notified_partner: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    mom: Mapped["User"] = relationship("User")


# ============================================================
# Partner Tasks
# ============================================================


class TaskTemplate(Base):
    """Predefined task templates."""

    __tablename__ = "task_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Task info
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[TaskDifficulty] = mapped_column(SAEnum(TaskDifficulty))
    points: Mapped[int] = mapped_column(Integer)

    # Categorization
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PartnerDailyTask(Base):
    """Daily tasks assigned to a partner."""

    __tablename__ = "partner_daily_tasks"
    __table_args__ = (
        UniqueConstraint(
            "binding_id", "date", "template_id", name="uq_partner_daily_task"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )
    template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("task_templates.id", ondelete="CASCADE")
    )

    # Date
    date: Mapped[datetime] = mapped_column(Date, index=True)

    # Status
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus), default=TaskStatus.AVAILABLE
    )

    # Completion
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    mom_feedback: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # emoji or text

    # Points awarded (may differ from template if bonus applied)
    points_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")
    template: Mapped["TaskTemplate"] = relationship("TaskTemplate")


# ============================================================
# Partner Progress
# ============================================================


class PartnerProgress(Base):
    """Partner's progress tracking."""

    __tablename__ = "partner_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), unique=True
    )

    # Points and level
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    current_level: Mapped[PartnerLevel] = mapped_column(
        SAEnum(PartnerLevel), default=PartnerLevel.INTERN
    )

    # Stats
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    tasks_confirmed: Mapped[int] = mapped_column(Integer, default=0)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_task_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


class PartnerBadge(Base):
    """Badge awarded to partner."""

    __tablename__ = "partner_badges"
    __table_args__ = (
        UniqueConstraint("binding_id", "badge_type", name="uq_partner_badge"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Badge info
    badge_type: Mapped[str] = mapped_column(String(50), index=True)
    badge_name: Mapped[str] = mapped_column(String(100))
    badge_icon: Mapped[str] = mapped_column(String(20))  # Emoji
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Awarded
    awarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


# ============================================================
# Memory (Time Recorder)
# ============================================================


class Memory(Base):
    """Memory photo and note for time recorder."""

    __tablename__ = "memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    binding_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("partner_bindings.id", ondelete="CASCADE"), index=True
    )

    # Content
    photo_url: Mapped[str] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Date
    date: Mapped[datetime] = mapped_column(Date, index=True)

    # Baby milestone (for album generation)
    milestone: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # e.g., "满月", "百天"

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    binding: Mapped["PartnerBinding"] = relationship("PartnerBinding")


# Import User for relationship type hints
from app.services.community.models import User  # noqa: E402, F401
