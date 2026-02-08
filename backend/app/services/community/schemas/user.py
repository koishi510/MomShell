"""User schemas for community module."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from ..enums import UserRole
from .base import TagInfo

# Family roles that users can freely switch between
FamilyRoleType = Literal["mom", "dad", "family"]


class UserProfileUpdate(BaseModel):
    """Request schema for updating user profile."""

    nickname: str | None = Field(None, min_length=1, max_length=50)
    email: EmailStr | None = None
    avatar_url: str | None = Field(None, max_length=500)
    role: FamilyRoleType | None = Field(
        None, description="Only family roles allowed: mom, dad, family"
    )


class UserStats(BaseModel):
    """User statistics."""

    question_count: int = 0
    answer_count: int = 0
    like_received_count: int = 0
    collection_count: int = 0


class UserProfile(BaseModel):
    """User profile response with statistics."""

    id: str
    nickname: str
    email: str
    avatar_url: str | None = None
    role: UserRole
    is_certified: bool = False
    certification_title: str | None = None
    stats: UserStats
    created_at: datetime


class MyQuestionListItem(BaseModel):
    """Question list item for my questions page."""

    id: str
    title: str
    content_preview: str
    channel: str
    tags: list[TagInfo]
    view_count: int
    answer_count: int
    like_count: int
    collection_count: int
    status: str
    has_accepted_answer: bool
    is_liked: bool = False
    is_collected: bool = False
    created_at: datetime


class QuestionBrief(BaseModel):
    """Brief question info for answer context."""

    id: str
    title: str
    channel: str


class MyAnswerListItem(BaseModel):
    """Answer list item with question context."""

    id: str
    content_preview: str
    question: QuestionBrief
    is_professional: bool
    is_accepted: bool
    like_count: int
    comment_count: int
    status: str
    is_liked: bool = False
    created_at: datetime
