"""Echo Domain Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from .enums import (
    AudioType,
    MeditationPhase,
    SceneCategory,
    ShellState,
    StickerType,
    TagType,
    WishStatus,
)

# ============================================================
# Echo Status
# ============================================================


class EchoStatusResponse(BaseModel):
    """Response for user's Echo status."""

    role: str | None  # "mom" | "partner" | None
    has_binding: bool
    binding_id: str | None
    identity_tags_count: int
    meditation_sessions_count: int
    total_meditation_minutes: int


# ============================================================
# Identity Tags
# ============================================================


class IdentityTagCreate(BaseModel):
    """Request to create an identity tag."""

    tag_type: TagType
    content: str = Field(..., min_length=1, max_length=100)


class IdentityTagResponse(BaseModel):
    """Response for an identity tag."""

    id: str
    tag_type: TagType
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class IdentityTagListResponse(BaseModel):
    """Response for identity tag list grouped by type."""

    music: list[IdentityTagResponse]
    sound: list[IdentityTagResponse]
    literature: list[IdentityTagResponse]
    memory: list[IdentityTagResponse]


# ============================================================
# Scenes
# ============================================================


class SceneResponse(BaseModel):
    """Response for a scene."""

    id: str
    title: str
    description: str | None
    image_url: str
    thumbnail_url: str | None
    category: SceneCategory
    keywords: list[str]
    match_score: float | None = None  # Used when matching

    class Config:
        from_attributes = True


class SceneMatchRequest(BaseModel):
    """Request for scene matching."""

    limit: int = Field(default=5, ge=1, le=20)


# ============================================================
# Audio
# ============================================================


class AudioResponse(BaseModel):
    """Response for an audio resource."""

    id: str
    title: str
    description: str | None
    audio_url: str
    duration_seconds: int | None
    audio_type: AudioType
    keywords: list[str]
    match_score: float | None = None

    class Config:
        from_attributes = True


class AudioMatchRequest(BaseModel):
    """Request for audio matching."""

    limit: int = Field(default=5, ge=1, le=20)


# ============================================================
# Meditation
# ============================================================


class MeditationStartRequest(BaseModel):
    """Request to start a meditation session."""

    target_duration_minutes: int = Field(default=10, ge=1, le=60)
    scene_id: str | None = None
    audio_id: str | None = None


class MeditationStartResponse(BaseModel):
    """Response for starting meditation."""

    session_id: str
    target_duration_minutes: int
    scene: SceneResponse | None
    audio: AudioResponse | None
    breathing_rhythm: dict[str, int]


class MeditationEndRequest(BaseModel):
    """Request to end a meditation session."""

    session_id: str
    actual_duration_seconds: int


class MeditationEndResponse(BaseModel):
    """Response for ending meditation."""

    session_id: str
    completed: bool
    actual_duration_seconds: int
    target_duration_minutes: int
    completion_rate: float  # 0-1


class MeditationStatsResponse(BaseModel):
    """Response for meditation statistics."""

    total_sessions: int
    completed_sessions: int
    total_minutes: int
    average_duration_minutes: float
    current_streak: int
    longest_streak: int
    last_session_date: datetime | None


class BreathingGuide(BaseModel):
    """Breathing guide for meditation."""

    phase: MeditationPhase
    duration_seconds: int
    instruction: str


# ============================================================
# Window Clarity (Partner Mode)
# ============================================================


class WindowClarityResponse(BaseModel):
    """Response for window clarity status."""

    clarity_level: int  # 0-100
    tasks_completed_today: int
    tasks_confirmed_today: int
    streak_bonus: int
    level_bonus: int
    breakdown: dict[str, int]  # Detailed breakdown of clarity sources


class ClarityCalculation(BaseModel):
    """Detailed clarity calculation breakdown."""

    base_clarity: int  # From confirmed tasks
    task_clarity: int  # From completed but unconfirmed
    streak_bonus: int  # From streak days
    level_bonus: int  # From partner level
    total: int


# ============================================================
# Partner Memories
# ============================================================


class MemoryInjectRequest(BaseModel):
    """Request to inject a memory for partner."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=2000)
    image_url: str | None = None
    reveal_at_clarity: int = Field(default=50, ge=0, le=100)


class PartnerMemoryResponse(BaseModel):
    """Response for a partner memory."""

    id: str
    title: str
    content: str
    image_url: str | None
    reveal_at_clarity: int
    is_revealed: bool
    revealed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class RevealedMemoriesResponse(BaseModel):
    """Response for revealed memories."""

    memories: list[PartnerMemoryResponse]
    current_clarity: int
    next_memory_at: int | None  # Clarity level needed for next reveal


# ============================================================
# Youth Memoirs
# ============================================================


class MemoirGenerateRequest(BaseModel):
    """Request to generate a youth memoir."""

    theme: str | None = None  # Optional theme hint


class MemoirResponse(BaseModel):
    """Response for a youth memoir."""

    id: str
    title: str
    content: str
    cover_image_url: str | None
    user_rating: float | None
    created_at: datetime

    class Config:
        from_attributes = True


class MemoirRatingRequest(BaseModel):
    """Request to rate a memoir."""

    rating: float = Field(..., ge=1, le=5)


class MemoirListResponse(BaseModel):
    """Response for memoir list."""

    memoirs: list[MemoirResponse]
    total: int


# ============================================================
# Wish Bottle (心愿漂流瓶)
# ============================================================


class WishBottleCreate(BaseModel):
    """Request to create a wish bottle."""

    content: str = Field(..., min_length=1, max_length=200)


class WishBottleResponse(BaseModel):
    """Response for a wish bottle."""

    id: str
    content: str
    status: WishStatus
    created_at: datetime
    accepted_at: datetime | None
    fulfilled_at: datetime | None
    confirmed_at: datetime | None
    sender_nickname: str | None = None

    class Config:
        from_attributes = True


class WishSeaResponse(BaseModel):
    """Response for wish sea (partner's view)."""

    wishes: list[WishBottleResponse]
    pending_count: int
    accepted_count: int
    fulfilled_count: int


class WishFulfillRequest(BaseModel):
    """Request to mark a wish as fulfilled."""

    note: str | None = Field(default=None, max_length=200)


# ============================================================
# Memory Sticker (记忆贴纸)
# ============================================================


class MemoryStickerCreate(BaseModel):
    """Request to create a memory sticker."""

    tags: list[str] = Field(..., min_length=1, max_length=3)
    memory_text: str | None = Field(default=None, max_length=200)


class MemoryStickerResponse(BaseModel):
    """Response for a memory sticker."""

    id: str
    title: str
    memory_text: str
    image_url: str
    tags_used: list[str]
    sticker_type: StickerType
    is_new: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StickerListResponse(BaseModel):
    """Response for sticker collection."""

    stickers: list[MemoryStickerResponse]
    total: int
    new_count: int


# ============================================================
# Shell State (贝壳状态)
# ============================================================


class ShellResponse(BaseModel):
    """Response for a shell on the beach."""

    id: str
    label: str
    state: ShellState
    position_x: int
    position_y: int
    is_task: bool
    is_wish: bool
    sticker_id: str | None
    wish_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class BeachShellsResponse(BaseModel):
    """Response for all shells on the beach."""

    shells: list[ShellResponse]
    dusty_count: int
    muddy_count: int
    clean_count: int
    golden_count: int


# ============================================================
# Inject Memory (伴侣注入记忆)
# ============================================================


class InjectMemoryRequest(BaseModel):
    """Request to inject a memory (partner mode)."""

    content: str = Field(..., min_length=1, max_length=300)
    image_url: str | None = None


class InjectMemoryResponse(BaseModel):
    """Response for injected memory."""

    id: str
    shell_id: str
    message: str
