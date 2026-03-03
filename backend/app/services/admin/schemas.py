"""Schemas for admin API."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# --- Pagination ---


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- User Management ---


class AdminUserListItem(BaseModel):
    """User item in admin list view."""

    id: str
    username: str
    email: str
    nickname: str
    avatar_url: str | None = None
    role: str
    is_active: bool
    is_banned: bool
    is_guest: bool
    postpartum_weeks: int | None = None
    created_at: datetime
    last_active_at: datetime | None = None

    class Config:
        from_attributes = True


class AdminUserDetail(AdminUserListItem):
    """Detailed user view for admin."""

    shell_code: str | None = None
    partner_id: str | None = None
    baby_birth_date: datetime | None = None
    updated_at: datetime
    has_certification: bool = False
    certification_status: str | None = None

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    """Admin user update request."""

    role: str | None = None
    is_active: bool | None = None
    is_banned: bool | None = None


# --- Config ---


class ConfigResponse(BaseModel):
    """Runtime config (secrets masked)."""

    app_name: str
    debug: bool
    database_url: str
    modelscope_key: str
    modelscope_base_url: str
    modelscope_model: str
    modelscope_image_model: str
    jwt_algorithm: str
    jwt_access_token_expire_minutes: int
    jwt_refresh_token_expire_days: int
    firecrawl_api_key: str
    tts_voice: str
    tts_rate: str
    pose_model_complexity: int
    min_detection_confidence: float
    min_tracking_confidence: float


class ConfigUpdate(BaseModel):
    """Updatable config fields."""

    modelscope_key: str | None = None
    modelscope_base_url: str | None = None
    modelscope_model: str | None = None
    modelscope_image_model: str | None = None
    firecrawl_api_key: str | None = None
    tts_voice: str | None = None
    tts_rate: str | None = None
    jwt_access_token_expire_minutes: int | None = Field(None, ge=1)
    jwt_refresh_token_expire_days: int | None = Field(None, ge=1)
    debug: bool | None = None


# --- Dashboard Stats ---


class DashboardStats(BaseModel):
    """Dashboard overview statistics."""

    total_users: int
    users_by_role: dict[str, int]
    active_users: int
    banned_users: int
    guest_users: int
    total_questions: int
    pending_questions: int
    total_answers: int
    total_certifications: int
    pending_certifications: int
