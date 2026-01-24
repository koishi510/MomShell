"""Base schemas for community module."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from ..enums import CertificationStatus, UserRole

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuthorInfo(BaseModel):
    """Author information (embedded in responses)."""

    id: str
    nickname: str
    avatar_url: str | None = None
    role: UserRole
    is_certified: bool = False
    certification_title: str | None = None  # e.g., "某医院 妇产科 主任医师"


class TagInfo(BaseModel):
    """Tag information (embedded in responses)."""

    id: str
    name: str
    slug: str


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""

    created_at: datetime
    updated_at: datetime
