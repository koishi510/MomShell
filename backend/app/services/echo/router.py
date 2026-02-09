"""Echo Domain API router."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth.dependencies import CurrentUserJWT

from .schemas import (
    AudioResponse,
    BeachShellsResponse,
    EchoStatusResponse,
    IdentityTagCreate,
    IdentityTagListResponse,
    IdentityTagResponse,
    InjectMemoryRequest,
    InjectMemoryResponse,
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
    MemoryStickerCreate,
    MemoryStickerResponse,
    PartnerMemoryResponse,
    RevealedMemoriesResponse,
    SceneResponse,
    StickerListResponse,
    WindowClarityResponse,
    WishBottleCreate,
    WishBottleResponse,
    WishFulfillRequest,
    WishSeaResponse,
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
# Wish Bottles (心愿漂流瓶)
# ============================================================


@router.post("/wish", response_model=WishBottleResponse)
async def send_wish(
    data: WishBottleCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishBottleResponse:
    """Send a wish bottle to partner (Mom mode)."""
    service = EchoService(db)
    try:
        result = await service.send_wish(current_user.id, data.content)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/wish-sea", response_model=WishSeaResponse)
async def get_wish_sea(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishSeaResponse:
    """Get wish sea with all wish bottles (Partner mode)."""
    service = EchoService(db)
    try:
        return await service.get_wish_sea(current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/wish/{wish_id}/accept")
async def accept_wish(
    wish_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Accept a wish bottle (Partner mode)."""
    service = EchoService(db)
    try:
        await service.accept_wish(wish_id, current_user.id)
        await db.commit()
        return {"message": "已接住心愿"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/wish/{wish_id}/fulfill", response_model=WishBottleResponse)
async def fulfill_wish(
    wish_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    data: WishFulfillRequest | None = None,
) -> WishBottleResponse:
    """Mark a wish as fulfilled (Partner mode)."""
    service = EchoService(db)
    try:
        result = await service.fulfill_wish(
            wish_id, current_user.id, data.note if data else None
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/wish/{wish_id}/confirm", response_model=WishBottleResponse)
async def confirm_wish_fulfilled(
    wish_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WishBottleResponse:
    """Confirm wish was fulfilled (Mom mode)."""
    service = EchoService(db)
    try:
        result = await service.confirm_wish_fulfilled(wish_id, current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Memory Stickers (记忆贴纸)
# ============================================================


@router.post("/memory", response_model=MemoryStickerResponse)
async def create_memory_sticker(
    data: MemoryStickerCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryStickerResponse:
    """Create a memory sticker from shell cleaning (Mom mode)."""
    service = EchoService(db)
    try:
        result = await service.create_memory_sticker(
            current_user.id, data.tags, data.memory_text
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/stickers", response_model=StickerListResponse)
async def get_stickers(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(20, ge=1, le=100),  # noqa: B008
    offset: int = Query(0, ge=0),  # noqa: B008
) -> StickerListResponse:
    """Get memory sticker collection."""
    service = EchoService(db)
    return await service.get_stickers(current_user.id, limit, offset)


@router.post("/stickers/{sticker_id}/view")
async def mark_sticker_viewed(
    sticker_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Mark a sticker as viewed (remove 'new' flag)."""
    service = EchoService(db)
    try:
        await service.mark_sticker_viewed(sticker_id, current_user.id)
        await db.commit()
        return {"message": "已标记为已查看"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Inject Memory (伴侣注入记忆)
# ============================================================


@router.post("/inject-memory", response_model=InjectMemoryResponse)
async def inject_memory_for_mom(
    data: InjectMemoryRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InjectMemoryResponse:
    """Inject a memory to create a golden shell on mom's beach (Partner mode)."""
    service = EchoService(db)
    try:
        result = await service.inject_memory_for_mom(
            current_user.id, data.content, data.image_url
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Beach Shells (沙滩贝壳)
# ============================================================


@router.get("/shells", response_model=BeachShellsResponse)
async def get_beach_shells(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BeachShellsResponse:
    """Get all shells on the user's beach."""
    service = EchoService(db)
    return await service.get_beach_shells(current_user.id)
