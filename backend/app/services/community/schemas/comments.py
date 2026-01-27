"""Comment schemas for community module."""

from datetime import datetime

from pydantic import BaseModel, Field

from .base import AuthorInfo


class CommentCreate(BaseModel):
    """Request schema for creating a comment."""

    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: str | None = None  # For nested replies


class CommentListItem(BaseModel):
    """Comment list item response."""

    id: str
    answer_id: str
    author: AuthorInfo
    content: str
    parent_id: str | None
    reply_to_user: AuthorInfo | None = None
    like_count: int
    is_liked: bool = False
    created_at: datetime
    replies: list["CommentListItem"] = Field(default_factory=list)


# Update forward reference
CommentListItem.model_rebuild()
