"""Echo Domain API router."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth.dependencies import CurrentUserJWT

from .schemas import (
    ArchiveResponse,
    AudioResponse,
    EchoStatusResponse,
    IdentityTagCreate,
    IdentityTagListResponse,
    IdentityTagResponse,
    MeditationEndRequest,
    MeditationEndResponse,
    MeditationStartRequest,
    MeditationStartResponse,
    MeditationStatsResponse,
    MemoirGenerateRequest,
    MemoirListResponse,
    MemoirRatingRequest,
    MemoirResponse,
    MemoryInjectRequest,
    MemoryReactRequest,
    MemoryShellCreate,
    MemoryShellResponse,
    NotificationListResponse,
    NotificationResponse,
    PartnerMemoryResponse,
    PoolStatusResponse,
    RevealedMemoriesResponse,
    SceneResponse,
    TaskCreateRequest,
    TaskShellListResponse,
    TaskShellResponse,
    WindowClarityResponse,
    WishBottleCreate,
    WishBottleListResponse,
    WishBottleResponse,
    WishCatchResponse,
    WishConfirmRequest,
)
from .service import EchoService

router = APIRouter(prefix="/echo", tags=["echo"])


# ============================================================
# Echo Status
# ============================================================


@router.get("/status", response_model=EchoStatusResponse)
async def get_echo_status(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EchoStatusResponse:
    """Get user's Echo status including role and statistics."""
    service = EchoService(db)
    return await service.get_echo_status(current_user.id)


# ============================================================
# Identity Tags (Mom Mode)
# ============================================================


@router.get("/identity-tags", response_model=IdentityTagListResponse)
async def get_identity_tags(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IdentityTagListResponse:
    """Get user's identity tags grouped by type."""
    service = EchoService(db)
    return await service.get_identity_tags(current_user.id)


@router.post("/identity-tags", response_model=IdentityTagResponse)
async def create_identity_tag(
    data: IdentityTagCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IdentityTagResponse:
    """Create a new identity tag."""
    service = EchoService(db)
    try:
        tag = await service.create_identity_tag(
            current_user.id, data.tag_type, data.content
        )
        await db.commit()
        return tag
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.delete("/identity-tags/{tag_id}")
async def delete_identity_tag(
    tag_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Delete an identity tag."""
    service = EchoService(db)
    try:
        await service.delete_identity_tag(tag_id, current_user.id)
        await db.commit()
        return {"message": "标签已删除"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Scenes & Audio Matching
# ============================================================


@router.get("/scenes/match", response_model=list[SceneResponse])
async def match_scenes(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(5, ge=1, le=20),  # noqa: B008
) -> list[SceneResponse]:
    """Match scenes based on user's identity tags."""
    service = EchoService(db)
    return await service.match_scenes_for_user(current_user.id, limit)


@router.get("/audio/match", response_model=list[AudioResponse])
async def match_audio(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(5, ge=1, le=20),  # noqa: B008
) -> list[AudioResponse]:
    """Match audio based on user's identity tags."""
    service = EchoService(db)
    return await service.match_audio_for_user(current_user.id, limit)


# ============================================================
# Meditation (Mom Mode)
# ============================================================


@router.post("/meditation/start", response_model=MeditationStartResponse)
async def start_meditation(
    data: MeditationStartRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeditationStartResponse:
    """Start a new meditation session."""
    service = EchoService(db)
    result = await service.start_meditation(
        current_user.id,
        data.target_duration_minutes,
        data.scene_id,
        data.audio_id,
    )
    await db.commit()
    return result


@router.post("/meditation/end", response_model=MeditationEndResponse)
async def end_meditation(
    data: MeditationEndRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeditationEndResponse:
    """End a meditation session."""
    service = EchoService(db)
    try:
        result = await service.end_meditation(
            data.session_id,
            current_user.id,
            data.actual_duration_seconds,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/meditation/stats", response_model=MeditationStatsResponse)
async def get_meditation_stats(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeditationStatsResponse:
    """Get meditation statistics for the user."""
    service = EchoService(db)
    return await service.get_meditation_stats(current_user.id)


# ============================================================
# Window Clarity (Partner Mode)
# ============================================================


@router.get("/window/clarity", response_model=WindowClarityResponse)
async def get_window_clarity(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WindowClarityResponse:
    """Get window clarity status for partner mode."""
    service = EchoService(db)
    try:
        result = await service.get_window_clarity(current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Partner Memories
# ============================================================


@router.post("/memories", response_model=PartnerMemoryResponse)
async def inject_memory(
    data: MemoryInjectRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PartnerMemoryResponse:
    """Partner injects a memory for mom to discover."""
    service = EchoService(db)
    try:
        result = await service.inject_memory(
            current_user.id,
            data.title,
            data.content,
            data.image_url,
            data.reveal_at_clarity,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/memories/revealed", response_model=RevealedMemoriesResponse)
async def get_revealed_memories(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RevealedMemoriesResponse:
    """Get revealed memories for mom."""
    service = EchoService(db)
    try:
        result = await service.get_revealed_memories(current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Youth Memoirs
# ============================================================


@router.get("/memoirs", response_model=MemoirListResponse)
async def get_memoirs(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(10, ge=1, le=50),  # noqa: B008
    offset: int = Query(0, ge=0),  # noqa: B008
) -> MemoirListResponse:
    """Get user's youth memoirs."""
    service = EchoService(db)
    return await service.get_memoirs(current_user.id, limit, offset)


@router.post("/memoirs/generate", response_model=MemoirResponse)
async def generate_memoir(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    data: MemoirGenerateRequest | None = None,
) -> MemoirResponse:
    """Generate a youth memoir based on identity tags."""
    service = EchoService(db)
    try:
        result = await service.generate_memoir(
            current_user.id,
            data.theme if data else None,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/memoirs/{memoir_id}/rate", response_model=MemoirResponse)
async def rate_memoir(
    memoir_id: str,
    data: MemoirRatingRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoirResponse:
    """Rate a memoir."""
    service = EchoService(db)
    try:
        result = await service.rate_memoir(memoir_id, current_user.id, data.rating)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Dad Mode 2.0: Task Shells
# ============================================================


@router.get("/shells", response_model=TaskShellListResponse)
async def get_task_shells(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_archived: bool = Query(False, description="Include archived shells"),
) -> TaskShellListResponse:
    """Get all task shells on beach."""
    service = EchoService(db)
    result = await service.get_task_shells(current_user.id, include_archived)
    return TaskShellListResponse(**result)


@router.post("/shells/{shell_id}/wash")
async def start_washing_shell(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Start washing a shell."""
    service = EchoService(db)
    try:
        result = await service.start_washing_shell(shell_id, current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/shells/{shell_id}/confirm")
async def confirm_shell_washing(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Confirm shell washing completion and reveal sticker."""
    service = EchoService(db)
    try:
        result = await service.confirm_shell_washing(shell_id, current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/tasks/create", response_model=TaskShellResponse)
async def create_task_shell(
    data: TaskCreateRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskShellResponse:
    """Create a task (dad or mom - co-building)."""
    service = EchoService(db)
    try:
        result = await service.create_task_shell(
            current_user.id,
            data.title,
            data.description,
            None,  # template_id
            data.creator_role,
        )
        await db.commit()
        return TaskShellResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/tasks/{shell_id}/accept", response_model=TaskShellResponse)
async def accept_task_shell(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TaskShellResponse:
    """Accept a mom-created task."""
    service = EchoService(db)
    try:
        result = await service.accept_task_shell(shell_id, current_user.id)
        await db.commit()
        return TaskShellResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/tasks/{shell_id}/reject")
async def reject_task_shell(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Reject a mom-created task."""
    service = EchoService(db)
    try:
        result = await service.reject_task_shell(shell_id, current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Dad Mode 2.0: Wish Bottles
# ============================================================


@router.get("/wishes", response_model=WishBottleListResponse)
async def get_wish_bottles(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishBottleListResponse:
    """Get all wish bottles."""
    service = EchoService(db)
    result = await service.get_wish_bottles(current_user.id)
    return WishBottleListResponse(**result)


@router.post("/wishes", response_model=WishBottleResponse)
async def create_wish_bottle(
    data: WishBottleCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishBottleResponse:
    """Mom creates a wish bottle."""
    service = EchoService(db)
    try:
        result = await service.create_wish_bottle(
            current_user.id,
            data.wish_type,
            data.content,
            data.emoji_hint,
        )
        await db.commit()
        return WishBottleResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/wishes/{wish_id}/catch", response_model=WishCatchResponse)
async def catch_wish_bottle(
    wish_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishCatchResponse:
    """Dad catches a wish bottle."""
    service = EchoService(db)
    try:
        result = await service.catch_wish_bottle(wish_id, current_user.id)
        await db.commit()
        return WishCatchResponse(
            wish=WishBottleResponse(**result["wish"]),
            shell=TaskShellResponse(**result["shell"]),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/wishes/{wish_id}/confirm", response_model=WishBottleResponse)
async def confirm_wish_granted(
    wish_id: str,
    data: WishConfirmRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishBottleResponse:
    """Mom confirms wish is granted."""
    service = EchoService(db)
    try:
        result = await service.confirm_wish_granted(
            wish_id, current_user.id, data.reaction
        )
        await db.commit()
        return WishBottleResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Dad Mode 2.0: Memory Shells
# ============================================================


@router.post("/memories/create", response_model=MemoryShellResponse)
async def create_memory_shell(
    data: MemoryShellCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryShellResponse:
    """Dad creates a memory shell for mom."""
    service = EchoService(db)
    try:
        result = await service.create_memory_shell(
            current_user.id,
            data.title,
            data.content,
            data.photo_url,
            data.sticker_style,
        )
        await db.commit()
        return MemoryShellResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/memories/{memory_id}/open", response_model=MemoryShellResponse)
async def open_memory_shell(
    memory_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryShellResponse:
    """Mom opens a memory shell."""
    service = EchoService(db)
    try:
        result = await service.open_memory_shell(memory_id, current_user.id)
        await db.commit()
        return MemoryShellResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/memories/{memory_id}/react", response_model=MemoryShellResponse)
async def react_to_memory(
    memory_id: str,
    data: MemoryReactRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryShellResponse:
    """Mom reacts to a memory."""
    service = EchoService(db)
    try:
        result = await service.react_to_memory(
            memory_id, current_user.id, data.reaction
        )
        await db.commit()
        return MemoryShellResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Dad Mode 2.0: Notifications
# ============================================================


@router.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(False, description="Only show unread notifications"),
) -> NotificationListResponse:
    """Get notifications for user."""
    service = EchoService(db)
    result = await service.get_notifications(current_user.id, unread_only)
    return NotificationListResponse(**result)


@router.post(
    "/notifications/{notification_id}/read", response_model=NotificationResponse
)
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationResponse:
    """Mark notification as read."""
    service = EchoService(db)
    try:
        result = await service.mark_notification_read(notification_id, current_user.id)
        await db.commit()
        return NotificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Mark all notifications as read."""
    service = EchoService(db)
    result = await service.mark_all_notifications_read(current_user.id)
    await db.commit()
    return result


# ============================================================
# Dad Mode 2.0: Archive & Pool Status
# ============================================================


@router.get("/archive", response_model=ArchiveResponse)
async def get_archive(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArchiveResponse:
    """Get archive data for "记" section."""
    service = EchoService(db)
    result = await service.get_archive(current_user.id)
    return ArchiveResponse(**result)


@router.get("/pools/status", response_model=PoolStatusResponse)
async def get_pool_status(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PoolStatusResponse:
    """Get Memory Pool and Task Pool status."""
    service = EchoService(db)
    result = await service.get_pool_status(current_user.id)
    return PoolStatusResponse(**result)
