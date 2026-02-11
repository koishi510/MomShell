"""Beach service Pydantic schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .enums import BottleStatus, MemoryInjectionStatus, ShellStatus, ShellType, UserIdentity


# ============================================================
# Identity Schemas
# ============================================================


class IdentitySelectRequest(BaseModel):
    """Request to select user identity (one-time, permanent)."""

    identity: UserIdentity = Field(..., description="Identity to select: origin_seeker or guardian")


class IdentityResponse(BaseModel):
    """Response with user identity information."""

    identity: UserIdentity | None
    identity_locked: bool
    shell_code: str | None = None

    class Config:
        from_attributes = True


class PairRequest(BaseModel):
    """Request to pair with partner using shell code."""

    partner_shell_code: str = Field(..., min_length=6, max_length=20)


class PairResponse(BaseModel):
    """Response after successful pairing."""

    success: bool
    partner_nickname: str | None = None
    partner_avatar_url: str | None = None
    message: str


# ============================================================
# Shell Schemas
# ============================================================


class ShellCreate(BaseModel):
    """Request to create a new shell (memory)."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str | None = Field(None, max_length=2000)
    memory_tag: str | None = Field(None, max_length=50)  # Selected memory tag


class ShellResponse(BaseModel):
    """Shell information response."""

    id: str
    shell_type: ShellType
    status: ShellStatus
    title: str
    content: str | None
    memory_tag: str | None
    sticker_id: str | None
    position_x: float | None
    position_y: float | None
    created_at: datetime
    opened_at: datetime | None
    completed_at: datetime | None

    class Config:
        from_attributes = True


class ShellListResponse(BaseModel):
    """List of shells (beach view)."""

    shells: list[ShellResponse]
    total: int


class ShellOpenRequest(BaseModel):
    """Request to open a dusty shell."""

    content: str = Field(..., min_length=1, max_length=2000)  # Memory description


# ============================================================
# Sticker Schemas
# ============================================================


class StickerGenerateRequest(BaseModel):
    """Request to generate a sticker from memory text."""

    memory_text: str = Field(..., min_length=1, max_length=1000)
    style: str = Field("sticker", max_length=50)  # Generation style


class StickerResponse(BaseModel):
    """Sticker information response."""

    id: str
    prompt: str
    style: str
    memory_text: str
    image_url: str
    thumbnail_url: str | None
    generation_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class StickerListResponse(BaseModel):
    """List of stickers (gallery view)."""

    stickers: list[StickerResponse]
    total: int


# ============================================================
# Drift Bottle Schemas
# ============================================================


class BottleCreateRequest(BaseModel):
    """Request to create a drift bottle (send a wish)."""

    wish_content: str = Field(..., min_length=1, max_length=500)


class BottleResponse(BaseModel):
    """Drift bottle information response."""

    id: str
    wish_content: str
    status: BottleStatus
    sender_nickname: str | None = None
    receiver_nickname: str | None = None
    created_at: datetime
    caught_at: datetime | None
    completed_at: datetime | None
    mom_confirmed: bool

    class Config:
        from_attributes = True


class BottleListResponse(BaseModel):
    """List of drift bottles."""

    bottles: list[BottleResponse]
    total: int


class BottleCatchResponse(BaseModel):
    """Response after catching a bottle."""

    success: bool
    bottle: BottleResponse | None = None
    message: str


class BottleCompleteRequest(BaseModel):
    """Request to mark a wish as completed."""

    completion_note: str | None = Field(None, max_length=500)


# ============================================================
# Memory Injection Schemas
# ============================================================


class MemoryInjectRequest(BaseModel):
    """Request to inject a memory (dad to mom)."""

    content_type: Literal["text", "photo"] = "text"
    content: str = Field(..., min_length=1, max_length=2000)  # Text or photo URL
    title: str | None = Field(None, max_length=200)
    generate_sticker: bool = False  # Whether to generate AI sticker


class MemoryInjectionResponse(BaseModel):
    """Memory injection information response."""

    id: str
    content_type: str
    content: str
    title: str | None
    status: MemoryInjectionStatus
    sticker_id: str | None
    created_at: datetime
    seen_at: datetime | None

    class Config:
        from_attributes = True


class MemoryInjectionListResponse(BaseModel):
    """List of memory injections."""

    injections: list[MemoryInjectionResponse]
    total: int


# ============================================================
# Beach View Schemas (Combined)
# ============================================================


class BeachViewResponse(BaseModel):
    """Combined beach view for mom or dad."""

    shells: list[ShellResponse]
    pending_bottles: int  # For dad: bottles to catch; For mom: pending wishes
    pending_injections: int  # For mom: unseen gifts
    partner_nickname: str | None = None
    partner_avatar_url: str | None = None


# ============================================================
# Task Shell Schemas (Dad mode specific)
# ============================================================


class TaskShellResponse(BaseModel):
    """Task shell response with task details."""

    id: str
    shell_type: ShellType
    status: ShellStatus
    title: str
    content: str | None
    task_difficulty: str | None = None
    task_points: int | None = None
    unlocked_sticker: StickerResponse | None = None  # Sticker revealed after completion
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class TaskCompleteRequest(BaseModel):
    """Request to mark a task as complete."""

    confirmation: bool = True  # Confirm task completion
