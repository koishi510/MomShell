"""Tag schemas for community module."""

from datetime import datetime

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    """Request schema for creating a tag."""

    name: str = Field(..., min_length=1, max_length=50)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(None, max_length=200)
    is_featured: bool = False


class TagUpdate(BaseModel):
    """Request schema for updating a tag."""

    name: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = Field(None, max_length=200)
    is_featured: bool | None = None
    is_active: bool | None = None


class TagListItem(BaseModel):
    """Tag list item response."""

    id: str
    name: str
    slug: str
    description: str | None
    question_count: int
    follower_count: int
    is_featured: bool


class TagDetail(TagListItem):
    """Tag detail response."""

    is_active: bool
    created_at: datetime
