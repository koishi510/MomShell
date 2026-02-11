"""Echo Domain Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from .enums import (
    AudioType,
    MeditationPhase,
    MemoryStatus,
    NotificationType,
    SceneCategory,
    ShellStatus,
    ShellType,
    StickerStyle,
    TagType,
    WishStatus,
    WishType,
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
# Dad Mode 2.0: Task Shells
# ============================================================


class TaskShellCreate(BaseModel):
    """Request to create a task shell."""

    title: str | None = Field(None, max_length=200)
    description: str | None = None
    template_id: str | None = None
    shell_type: ShellType = Field(default=ShellType.NORMAL)


class TaskShellResponse(BaseModel):
    """Response for a task shell."""

    id: str
    binding_id: str
    shell_type: ShellType
    status: ShellStatus
    creator_role: str
    template_id: str | None
    custom_title: str | None
    custom_description: str | None
    wish_bottle_id: str | None
    bound_memoir_id: str | None
    memory_sticker_url: str | None
    memory_text: str | None
    confirmation_status: str
    washing_started_at: datetime | None
    washed_at: datetime | None
    opened_at: datetime | None
    created_at: datetime
    # Related data
    template_title: str | None = None
    template_description: str | None = None
    template_points: int | None = None
    template_difficulty: str | None = None

    class Config:
        from_attributes = True


class TaskShellListResponse(BaseModel):
    """Response for task shell list."""

    shells: list[TaskShellResponse]
    total: int
    # Pool status
    memory_pool_waiting: int  # Number of unrevealed memories in pool


class ShellWashConfirmRequest(BaseModel):
    """Request to confirm shell washing."""

    message: str | None = Field(None, max_length=200)


class ShellWashResponse(BaseModel):
    """Response for shell washing."""

    shell_id: str
    sticker_url: str
    message: str
    is_echo_fragment: bool  # True if no memory was bound
    light_string_photo: dict | None  # Photo for light string


# ============================================================
# Dad Mode 2.0: Wish Bottles
# ============================================================


class WishBottleCreate(BaseModel):
    """Request to create a wish bottle."""

    wish_type: WishType
    content: str = Field(..., min_length=1, max_length=500)
    emoji_hint: str | None = Field(None, max_length=50)


class WishBottleResponse(BaseModel):
    """Response for a wish bottle."""

    id: str
    binding_id: str
    wish_type: WishType
    content: str
    emoji_hint: str | None
    status: WishStatus
    caught_at: datetime | None
    resulting_shell_id: str | None
    completed_at: datetime | None
    mom_reaction: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class WishBottleListResponse(BaseModel):
    """Response for wish bottle list."""

    bottles: list[WishBottleResponse]
    total: int


class WishCatchResponse(BaseModel):
    """Response for catching a wish."""

    wish: WishBottleResponse
    shell: TaskShellResponse


class WishConfirmRequest(BaseModel):
    """Request to confirm wish completion."""

    reaction: str = Field(..., min_length=1, max_length=20)  # emoji


# ============================================================
# Dad Mode 2.0: Memory Shells
# ============================================================


class MemoryShellCreate(BaseModel):
    """Request to create a memory shell."""

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=2000)
    photo_url: str | None = None
    sticker_style: StickerStyle = Field(default=StickerStyle.WATERCOLOR)


class MemoryShellResponse(BaseModel):
    """Response for a memory shell."""

    id: str
    binding_id: str
    creator_id: str
    title: str
    content: str
    photo_url: str | None
    sticker_style: StickerStyle
    sticker_url: str | None
    status: MemoryStatus
    opened_at: datetime | None
    mom_reaction: str | None
    error_message: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MemoryShellListResponse(BaseModel):
    """Response for memory shell list."""

    memories: list[MemoryShellResponse]
    total: int


class MemoryReactRequest(BaseModel):
    """Request to react to a memory."""

    reaction: str = Field(..., min_length=1, max_length=20)  # emoji


# ============================================================
# Dad Mode 2.0: Notifications
# ============================================================


class NotificationResponse(BaseModel):
    """Response for a notification."""

    id: str
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    related_entity_type: str | None
    related_entity_id: str | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response for notification list."""

    notifications: list[NotificationResponse]
    total: int
    unread_count: int


# ============================================================
# Dad Mode 2.0: Archive Data
# ============================================================


class ArchiveResponse(BaseModel):
    """Response for archive data ("记" section)."""

    # Task shells (washed and opened)
    completed_shells: list[TaskShellResponse]

    # Wish bottles (granted)
    granted_wishes: list[WishBottleResponse]

    # Memory shells (opened)
    sent_memories: list[MemoryShellResponse]  # Dad's sent memories
    received_memories: list[MemoryShellResponse]  # Mom's received memories

    # Echo fragments (special badges when no memory was bound)
    echo_fragment_count: int


# ============================================================
# Dad Mode 2.0: Pool Status
# ============================================================


class PoolStatusResponse(BaseModel):
    """Response for Memory Pool and Task Pool status."""

    # Memory Pool (mom's unrevealed memories)
    memory_pool_count: int
    memory_pool_over_limit: bool  # True if > 20 items

    # Task Pool (dad's pending tasks)
    task_pool_count: int  # muddy + washing + washed shells
    task_pool_by_status: dict[str, int]


# ============================================================
# Dad Mode 2.0: Task Creation (Co-building)
# ============================================================


class TaskCreateRequest(BaseModel):
    """Request to create a task (dad or mom)."""

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)
    creator_role: str = Field(..., pattern="^(dad|mom|system)$")


class TaskAcceptRejectRequest(BaseModel):
    """Request to accept or reject a mom-created task."""

    action: str = Field(..., pattern="^(accept|reject)$")
