"""Guardian module Pydantic schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from .enums import (
    BindingStatus,
    HealthCondition,
    MoodLevel,
    PartnerLevel,
    TaskDifficulty,
    TaskStatus,
)

# ============================================================
# Partner Binding Schemas
# ============================================================


class InviteResponse(BaseModel):
    """Response containing invite information."""

    invite_code: str
    invite_url: str
    expires_at: datetime | None


class BindRequest(BaseModel):
    """Request to bind as partner."""

    invite_code: str


class BindingResponse(BaseModel):
    """Response containing binding information."""

    id: str
    mom_id: str
    partner_id: str | None
    status: BindingStatus
    created_at: datetime
    bound_at: datetime | None

    class Config:
        from_attributes = True


class PartnerInfo(BaseModel):
    """Partner information for display."""

    id: str
    nickname: str
    avatar_url: str | None
    level: PartnerLevel
    total_points: int
    current_streak: int


class MomInfo(BaseModel):
    """Mom information for partner view."""

    id: str
    nickname: str
    avatar_url: str | None
    baby_birth_date: datetime | None
    postpartum_weeks: int | None


# ============================================================
# Daily Status Schemas
# ============================================================


class DailyStatusCreate(BaseModel):
    """Request to create/update daily status."""

    mood: MoodLevel = MoodLevel.NEUTRAL
    energy_level: int = Field(default=50, ge=0, le=100)
    health_conditions: list[HealthCondition] = []
    feeding_count: int = Field(default=0, ge=0)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    notes: str | None = None


class DailyStatusResponse(BaseModel):
    """Response containing daily status."""

    id: str
    status_date: date = Field(alias="date")
    mood: MoodLevel
    energy_level: int
    health_conditions: list[str]
    feeding_count: int
    sleep_hours: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class StatusNotification(BaseModel):
    """Notification to partner about mom's status."""

    status: DailyStatusResponse
    message: str
    suggestions: list[str]


# ============================================================
# Task Schemas
# ============================================================


class TaskTemplateResponse(BaseModel):
    """Task template information."""

    id: str
    title: str
    description: str
    difficulty: TaskDifficulty
    points: int
    category: str | None

    class Config:
        from_attributes = True


class DailyTaskResponse(BaseModel):
    """Daily task for partner."""

    id: str
    template: TaskTemplateResponse
    task_date: date = Field(alias="date")
    status: TaskStatus
    completed_at: datetime | None
    confirmed_at: datetime | None
    mom_feedback: str | None
    points_awarded: int | None

    class Config:
        from_attributes = True
        populate_by_name = True


class TaskCompleteRequest(BaseModel):
    """Request to mark task as completed."""

    notes: str | None = None


class TaskConfirmRequest(BaseModel):
    """Request from mom to confirm task completion."""

    feedback: str = Field(..., max_length=20)  # Emoji or short text


# ============================================================
# Progress Schemas
# ============================================================


class ProgressResponse(BaseModel):
    """Partner progress information."""

    total_points: int
    current_level: PartnerLevel
    next_level: PartnerLevel | None
    points_to_next_level: int | None
    tasks_completed: int
    tasks_confirmed: int
    current_streak: int
    longest_streak: int

    class Config:
        from_attributes = True


class BadgeResponse(BaseModel):
    """Partner badge information."""

    id: str
    badge_type: str
    badge_name: str
    badge_icon: str
    description: str | None
    awarded_at: datetime

    class Config:
        from_attributes = True


class LevelUpNotification(BaseModel):
    """Notification when partner levels up."""

    old_level: PartnerLevel
    new_level: PartnerLevel
    message: str


# ============================================================
# Memory Schemas
# ============================================================


class MemoryCreate(BaseModel):
    """Request to create a memory."""

    photo_url: str
    caption: str | None = None
    memory_date: date | None = Field(default=None, alias="date")
    milestone: str | None = None

    class Config:
        populate_by_name = True


class MemoryResponse(BaseModel):
    """Memory information."""

    id: str
    photo_url: str
    caption: str | None
    memory_date: date = Field(alias="date")
    milestone: str | None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class AlbumResponse(BaseModel):
    """Generated album/memory book."""

    title: str
    subtitle: str
    cover_photo_url: str | None
    memories: list[MemoryResponse]
    total_days: int
    milestones: list[str]


# ============================================================
# WebSocket Schemas
# ============================================================


class WSMessage(BaseModel):
    """WebSocket message."""

    type: str
    data: dict


class StatusUpdateMessage(BaseModel):
    """Status update notification for partner."""

    type: str = "status_update"
    status: DailyStatusResponse
    message: str
    suggestions: list[str]


class TaskConfirmationMessage(BaseModel):
    """Task confirmation notification for partner."""

    type: str = "task_confirmed"
    task_id: str
    feedback: str
    points_awarded: int
    new_total_points: int
