"""Answer schemas for community module."""

from datetime import datetime

from pydantic import BaseModel, Field

from ..enums import ContentStatus, UserRole
from .base import AuthorInfo


class AnswerCreate(BaseModel):
    """Request schema for creating an answer."""

    content: str = Field(..., min_length=1, max_length=20000)
    image_urls: list[str] = Field(default_factory=list, max_length=9)


class AnswerUpdate(BaseModel):
    """Request schema for updating an answer."""

    content: str | None = Field(None, min_length=10, max_length=20000)


class AnswerListItem(BaseModel):
    """Answer list item response."""

    id: str
    question_id: str
    author: AuthorInfo
    content: str = Field(description="Full content")
    content_preview: str = Field(description="Content preview (first 200 chars)")
    is_professional: bool
    is_accepted: bool
    like_count: int
    comment_count: int
    is_liked: bool = False  # Current user has liked
    created_at: datetime


class AnswerDetail(BaseModel):
    """Answer detail response."""

    id: str
    question_id: str
    author: AuthorInfo
    content: str
    image_urls: list[str]
    author_role: UserRole
    is_professional: bool
    is_accepted: bool
    status: ContentStatus
    like_count: int
    comment_count: int
    is_liked: bool = False  # Current user has liked
    created_at: datetime
    updated_at: datetime
