"""Community module SQLAlchemy models."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from .enums import (
    CertificationStatus,
    ChannelType,
    ContentStatus,
    ModerationResult,
    UserRole,
)

if TYPE_CHECKING:
    from typing import List


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid4())


# ============================================================
# User Related Tables
# ============================================================


class User(Base):
    """User table - extended to support role certification."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nickname: Mapped[str] = mapped_column(String(50))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.MOM)

    # Postpartum related info
    baby_birth_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    postpartum_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    certification: Mapped["UserCertification | None"] = relationship(
        "UserCertification", back_populates="user", uselist=False
    )
    questions: Mapped["List[Question]"] = relationship(
        "Question", back_populates="author"
    )
    answers: Mapped["List[Answer]"] = relationship("Answer", back_populates="author")
    comments: Mapped["List[Comment]"] = relationship(
        "Comment", back_populates="author", foreign_keys="[Comment.author_id]"
    )
    likes: Mapped["List[Like]"] = relationship("Like", back_populates="user")
    collections: Mapped["List[Collection]"] = relationship(
        "Collection", back_populates="user"
    )


class UserCertification(Base):
    """User certification table - stores professional credentials."""

    __tablename__ = "user_certifications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )

    # Certification info
    certification_type: Mapped[UserRole] = mapped_column(SAEnum(UserRole))
    real_name: Mapped[str] = mapped_column(String(50))
    id_card_number: Mapped[str | None] = mapped_column(String(18), nullable=True)
    license_number: Mapped[str] = mapped_column(String(100))  # License number
    hospital_or_institution: Mapped[str] = mapped_column(String(200))  # Institution
    department: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Department
    title: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Title

    # Supporting documents
    license_image_url: Mapped[str] = mapped_column(String(500))  # License photo
    id_card_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    additional_docs_urls: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON array

    # Review status
    status: Mapped[CertificationStatus] = mapped_column(
        SAEnum(CertificationStatus), default=CertificationStatus.PENDING
    )
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Validity period
    valid_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="certification")


# ============================================================
# Content Related Tables
# ============================================================


class Tag(Base):
    """Tag table."""

    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # URL-friendly
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Statistics
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    follower_count: Mapped[int] = mapped_column(Integer, default=0)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)  # Featured tag

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    questions: Mapped["List[Question]"] = relationship(
        "Question", secondary="question_tags", back_populates="tags"
    )


class QuestionTag(Base):
    """Question-Tag association table."""

    __tablename__ = "question_tags"

    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Question(Base):
    """Question table (posts)."""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Content
    title: Mapped[str] = mapped_column(String(200), index=True)
    content: Mapped[str] = mapped_column(Text)
    image_urls: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Channel configuration
    channel: Mapped[ChannelType] = mapped_column(
        SAEnum(ChannelType), default=ChannelType.EXPERIENCE, index=True
    )

    # Status
    status: Mapped[ContentStatus] = mapped_column(
        SAEnum(ContentStatus), default=ContentStatus.PENDING_REVIEW, index=True
    )

    # Statistics
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    answer_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    collection_count: Mapped[int] = mapped_column(Integer, default=0)

    # Pinned/Featured
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    # Accepted answer
    accepted_answer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="questions")
    answers: Mapped["List[Answer]"] = relationship(
        "Answer", back_populates="question", cascade="all, delete-orphan"
    )
    tags: Mapped["List[Tag]"] = relationship(
        "Tag", secondary="question_tags", back_populates="questions"
    )


class Answer(Base):
    """Answer table."""

    __tablename__ = "answers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Content
    content: Mapped[str] = mapped_column(Text)
    image_urls: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Author role (redundant storage for easy filtering)
    author_role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), index=True)
    is_professional: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Status
    status: Mapped[ContentStatus] = mapped_column(
        SAEnum(ContentStatus), default=ContentStatus.PENDING_REVIEW, index=True
    )

    # Statistics
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)

    # Accepted status
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="answers")
    author: Mapped["User"] = relationship("User", back_populates="answers")
    comments: Mapped["List[Comment]"] = relationship(
        "Comment", back_populates="answer", cascade="all, delete-orphan"
    )


class Comment(Base):
    """Comment table (nested replies)."""

    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    answer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("answers.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Reply target (supports nested comments)
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    reply_to_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Content
    content: Mapped[str] = mapped_column(Text)

    # Status
    status: Mapped[ContentStatus] = mapped_column(
        SAEnum(ContentStatus), default=ContentStatus.PENDING_REVIEW
    )

    # Statistics
    like_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    answer: Mapped["Answer"] = relationship("Answer", back_populates="comments")
    author: Mapped["User"] = relationship(
        "User", back_populates="comments", foreign_keys=[author_id]
    )
    parent: Mapped["Comment | None"] = relationship(
        "Comment", remote_side="Comment.id", backref="replies"
    )
    reply_to_user: Mapped["User | None"] = relationship(
        "User", foreign_keys=[reply_to_user_id]
    )


# ============================================================
# Interaction Tables
# ============================================================


class Like(Base):
    """Like table (polymorphic association)."""

    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", name="uq_user_like"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Polymorphic association
    target_type: Mapped[str] = mapped_column(
        String(20), index=True
    )  # question, answer, comment
    target_id: Mapped[str] = mapped_column(String(36), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="likes")


class Collection(Base):
    """Collection/Bookmark table."""

    __tablename__ = "collections"
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_user_collection"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )

    # Collection folder (optional)
    folder_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="collections")
    question: Mapped["Question"] = relationship("Question")


# ============================================================
# Moderation Tables
# ============================================================


class ModerationLog(Base):
    """Moderation log table."""

    __tablename__ = "moderation_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=generate_uuid
    )

    # Moderation target (polymorphic)
    target_type: Mapped[str] = mapped_column(
        String(20), index=True
    )  # question, answer, comment
    target_id: Mapped[str] = mapped_column(String(36), index=True)

    # Moderation info
    moderation_type: Mapped[str] = mapped_column(String(20))  # auto, manual
    result: Mapped[ModerationResult] = mapped_column(SAEnum(ModerationResult))
    sensitive_categories: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON array
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Moderation details
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_content: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Store original content

    # Reviewer (for manual review)
    reviewer_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    reviewer: Mapped["User | None"] = relationship("User")
