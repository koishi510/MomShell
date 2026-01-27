"""Question schemas for community module."""

from datetime import datetime

from pydantic import BaseModel, Field

from ..enums import ChannelType, ContentStatus
from .base import AuthorInfo, TagInfo


class QuestionCreate(BaseModel):
    """Request schema for creating a question."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=10000)
    channel: ChannelType = ChannelType.EXPERIENCE
    tag_ids: list[str] = Field(default_factory=list, max_length=5)
    image_urls: list[str] = Field(default_factory=list, max_length=9)


class QuestionUpdate(BaseModel):
    """Request schema for updating a question."""

    title: str | None = Field(None, min_length=5, max_length=200)
    content: str | None = Field(None, min_length=10, max_length=10000)
    tag_ids: list[str] | None = Field(None, max_length=5)


class QuestionListItem(BaseModel):
    """Question list item response."""

    id: str
    title: str
    content_preview: str = Field(description="Content preview (first 100 chars)")
    channel: ChannelType
    author: AuthorInfo
    tags: list[TagInfo]
    view_count: int
    answer_count: int
    like_count: int
    collection_count: int = 0
    is_pinned: bool
    is_featured: bool
    has_accepted_answer: bool
    is_liked: bool = False  # Current user has liked
    is_collected: bool = False  # Current user has collected
    created_at: datetime


class QuestionDetail(BaseModel):
    """Question detail response."""

    id: str
    title: str
    content: str
    content_preview: str
    channel: ChannelType
    status: ContentStatus
    author: AuthorInfo
    tags: list[TagInfo]
    image_urls: list[str]
    view_count: int
    answer_count: int
    like_count: int
    collection_count: int
    is_pinned: bool
    is_featured: bool
    has_accepted_answer: bool
    accepted_answer_id: str | None
    is_liked: bool = False  # Current user has liked
    is_collected: bool = False  # Current user has collected
    professional_answer_count: int = 0
    experience_answer_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
