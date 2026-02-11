"""Beach API router for Shell Beach system."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth.dependencies import CurrentUserJWT, OptionalUserJWT
from app.services.community.models import User
from app.services.guardian.models import PartnerBinding

from .enums import ShellType, UserIdentity
from .generator import get_sticker_generator
from .schemas import (
    BeachViewResponse,
    BottleCatchResponse,
    BottleCompleteRequest,
    BottleCreateRequest,
    BottleListResponse,
    BottleResponse,
    IdentityResponse,
    IdentitySelectRequest,
    MemoryInjectionListResponse,
    MemoryInjectionResponse,
    MemoryInjectRequest,
    PairRequest,
    PairResponse,
    ShellCreate,
    ShellListResponse,
    ShellOpenRequest,
    ShellResponse,
    StickerGenerateRequest,
    StickerListResponse,
    StickerResponse,
    TaskCompleteRequest,
)
from .service import BeachService

router = APIRouter(prefix="/beach", tags=["beach"])


# ============================================================
# Identity Endpoints
# ============================================================


@router.get("/identity", response_model=IdentityResponse)
async def get_identity(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IdentityResponse:
    """Get current user's identity information."""
    service = BeachService(db)
    result = await service.get_user_identity(current_user.id)
    return IdentityResponse(**result)


@router.post("/identity/select", response_model=IdentityResponse)
async def select_identity(
    request: IdentitySelectRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IdentityResponse:
    """Select user identity (one-time, permanent)."""
    service = BeachService(db)

    try:
        result = await service.select_identity(current_user.id, request.identity)
        return IdentityResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/identity/shell-code")
async def get_shell_code(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get user's shell code for pairing."""
    service = BeachService(db)
    shell_code = await service.get_shell_code(current_user.id)

    if not shell_code:
        raise HTTPException(status_code=404, detail="Shell code not found. Please select identity first.")

    return {"shell_code": shell_code}


@router.post("/identity/pair", response_model=PairResponse)
async def pair_with_partner(
    request: PairRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PairResponse:
    """Pair with partner using shell code."""
    service = BeachService(db)
    result = await service.pair_with_partner(current_user.id, request.partner_shell_code)
    return PairResponse(**result)


# ============================================================
# Shell Endpoints
# ============================================================


@router.get("/shells", response_model=ShellListResponse)
async def list_shells(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    shell_type: ShellType | None = None,
) -> ShellListResponse:
    """List user's shells (beach view)."""
    service = BeachService(db)
    shells = await service.get_shells(current_user.id, shell_type)
    return ShellListResponse(
        shells=[ShellResponse.model_validate(s) for s in shells],
        total=len(shells),
    )


@router.post("/shells", response_model=ShellResponse)
async def create_shell(
    request: ShellCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShellResponse:
    """Create a new shell (memory)."""
    # Only origin_seeker can create memory shells
    if current_user.identity != UserIdentity.ORIGIN_SEEKER:
        raise HTTPException(
            status_code=403,
            detail="Only origin_seeker (mom) can create memory shells",
        )

    service = BeachService(db)
    shell = await service.create_shell(
        user_id=current_user.id,
        title=request.title,
        content=request.content,
        memory_tag=request.memory_tag,
        shell_type=ShellType.MEMORY,
    )
    return ShellResponse.model_validate(shell)


@router.get("/shells/{shell_id}", response_model=ShellResponse)
async def get_shell(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShellResponse:
    """Get a specific shell."""
    service = BeachService(db)
    shell = await service.get_shell(shell_id, current_user.id)

    if not shell:
        raise HTTPException(status_code=404, detail="Shell not found")

    return ShellResponse.model_validate(shell)


@router.patch("/shells/{shell_id}/open", response_model=ShellResponse)
async def open_shell(
    shell_id: str,
    request: ShellOpenRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShellResponse:
    """Open a dusty shell and record memory."""
    service = BeachService(db)

    try:
        shell = await service.open_shell(shell_id, current_user.id, request.content)
        if not shell:
            raise HTTPException(status_code=404, detail="Shell not found")
        return ShellResponse.model_validate(shell)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/shells/{shell_id}/complete", response_model=ShellResponse)
async def complete_shell(
    shell_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShellResponse:
    """Mark shell as completed (for task shells)."""
    service = BeachService(db)
    shell = await service.complete_shell(shell_id, current_user.id)

    if not shell:
        raise HTTPException(status_code=404, detail="Shell not found")

    return ShellResponse.model_validate(shell)


# ============================================================
# Sticker Endpoints
# ============================================================


@router.get("/stickers", response_model=StickerListResponse)
async def list_stickers(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerListResponse:
    """List user's stickers (gallery)."""
    service = BeachService(db)
    stickers = await service.get_stickers(current_user.id)
    return StickerListResponse(
        stickers=[StickerResponse.model_validate(s) for s in stickers],
        total=len(stickers),
    )


@router.post("/stickers/generate", response_model=StickerResponse)
async def generate_sticker(
    request: StickerGenerateRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerResponse:
    """Generate a sticker from memory text."""
    generator = get_sticker_generator()
    result = await generator.generate(request.memory_text, request.style)

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=f"Sticker generation failed: {result.get('error', 'Unknown error')}",
        )

    service = BeachService(db)
    sticker = await service.create_sticker(
        user_id=current_user.id,
        memory_text=request.memory_text,
        prompt=result["prompt"],
        image_url=result["image_url"],
        style=request.style,
        generation_model=result.get("model"),
    )

    return StickerResponse.model_validate(sticker)


@router.get("/stickers/{sticker_id}", response_model=StickerResponse)
async def get_sticker(
    sticker_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StickerResponse:
    """Get a specific sticker."""
    service = BeachService(db)
    sticker = await service.get_sticker(sticker_id)

    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")

    # Check ownership
    if sticker.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return StickerResponse.model_validate(sticker)


# ============================================================
# Drift Bottle Endpoints
# ============================================================


@router.get("/bottles", response_model=BottleListResponse)
async def list_bottles(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BottleListResponse:
    """List drift bottles (sent for mom, received for dad)."""
    service = BeachService(db)

    # Determine if user is sender (mom) or receiver (dad)
    as_sender = current_user.identity == UserIdentity.ORIGIN_SEEKER
    bottles = await service.get_bottles(current_user.id, as_sender=as_sender)

    return BottleListResponse(
        bottles=[BottleResponse.model_validate(b) for b in bottles],
        total=len(bottles),
    )


@router.post("/bottles", response_model=BottleResponse)
async def create_bottle(
    request: BottleCreateRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BottleResponse:
    """Create a drift bottle (mom sends wish)."""
    if current_user.identity != UserIdentity.ORIGIN_SEEKER:
        raise HTTPException(
            status_code=403,
            detail="Only origin_seeker (mom) can send drift bottles",
        )

    # Get binding
    from sqlalchemy import select

    binding_result = await db.execute(
        select(PartnerBinding).where(PartnerBinding.mom_id == current_user.id)
    )
    binding = binding_result.scalar_one_or_none()

    if not binding:
        raise HTTPException(status_code=400, detail="No partner binding found")

    service = BeachService(db)
    bottle = await service.create_bottle(
        sender_id=current_user.id,
        wish_content=request.wish_content,
        binding_id=binding.id,
    )

    return BottleResponse.model_validate(bottle)


@router.patch("/bottles/{bottle_id}/catch", response_model=BottleCatchResponse)
async def catch_bottle(
    bottle_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BottleCatchResponse:
    """Catch a drifting bottle (dad catches)."""
    if current_user.identity != UserIdentity.GUARDIAN:
        raise HTTPException(
            status_code=403,
            detail="Only guardian (dad) can catch drift bottles",
        )

    service = BeachService(db)
    bottle = await service.catch_bottle(bottle_id, current_user.id)

    if not bottle:
        return BottleCatchResponse(
            success=False,
            message="Bottle not found or already caught",
        )

    return BottleCatchResponse(
        success=True,
        bottle=BottleResponse.model_validate(bottle),
        message="Successfully caught the bottle!",
    )


@router.patch("/bottles/{bottle_id}/complete", response_model=BottleResponse)
async def complete_bottle(
    bottle_id: str,
    request: BottleCompleteRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BottleResponse:
    """Mark a wish as completed (dad completes)."""
    if current_user.identity != UserIdentity.GUARDIAN:
        raise HTTPException(
            status_code=403,
            detail="Only guardian (dad) can complete wishes",
        )

    service = BeachService(db)
    bottle = await service.complete_bottle(bottle_id, current_user.id)

    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found or not caught yet")

    return BottleResponse.model_validate(bottle)


@router.patch("/bottles/{bottle_id}/confirm", response_model=BottleResponse)
async def confirm_bottle(
    bottle_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BottleResponse:
    """Mom confirms that wish was completed."""
    if current_user.identity != UserIdentity.ORIGIN_SEEKER:
        raise HTTPException(
            status_code=403,
            detail="Only origin_seeker (mom) can confirm wish completion",
        )

    service = BeachService(db)
    bottle = await service.confirm_bottle_completion(bottle_id, current_user.id)

    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found or not completed yet")

    return BottleResponse.model_validate(bottle)


# ============================================================
# Memory Injection Endpoints
# ============================================================


@router.get("/injections", response_model=MemoryInjectionListResponse)
async def list_injections(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryInjectionListResponse:
    """List memory injections (sent for dad, received for mom)."""
    service = BeachService(db)

    as_sender = current_user.identity == UserIdentity.GUARDIAN
    injections = await service.get_memory_injections(current_user.id, as_sender=as_sender)

    return MemoryInjectionListResponse(
        injections=[MemoryInjectionResponse.model_validate(i) for i in injections],
        total=len(injections),
    )


@router.post("/injections", response_model=MemoryInjectionResponse)
async def create_injection(
    request: MemoryInjectRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryInjectionResponse:
    """Inject a memory (dad sends to mom)."""
    if current_user.identity != UserIdentity.GUARDIAN:
        raise HTTPException(
            status_code=403,
            detail="Only guardian (dad) can inject memories",
        )

    # Get binding
    from sqlalchemy import select

    binding_result = await db.execute(
        select(PartnerBinding).where(PartnerBinding.partner_id == current_user.id)
    )
    binding = binding_result.scalar_one_or_none()

    if not binding:
        raise HTTPException(status_code=400, detail="No partner binding found")

    # Generate sticker if requested
    sticker_id = None
    if request.generate_sticker and request.content_type == "text":
        generator = get_sticker_generator()
        result = await generator.generate(request.content, "sticker")

        if result.get("success"):
            service = BeachService(db)
            sticker = await service.create_sticker(
                user_id=current_user.id,
                memory_text=request.content,
                prompt=result["prompt"],
                image_url=result["image_url"],
                style="sticker",
                generation_model=result.get("model"),
            )
            sticker_id = sticker.id

    service = BeachService(db)
    injection = await service.create_memory_injection(
        sender_id=current_user.id,
        receiver_id=binding.mom_id,
        binding_id=binding.id,
        content_type=request.content_type,
        content=request.content,
        title=request.title,
        sticker_id=sticker_id,
    )

    return MemoryInjectionResponse.model_validate(injection)


@router.patch("/injections/{injection_id}/seen", response_model=MemoryInjectionResponse)
async def mark_injection_seen(
    injection_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryInjectionResponse:
    """Mark a memory injection as seen by mom."""
    if current_user.identity != UserIdentity.ORIGIN_SEEKER:
        raise HTTPException(
            status_code=403,
            detail="Only origin_seeker (mom) can mark injections as seen",
        )

    service = BeachService(db)
    injection = await service.mark_injection_seen(injection_id, current_user.id)

    if not injection:
        raise HTTPException(status_code=404, detail="Injection not found")

    return MemoryInjectionResponse.model_validate(injection)


# ============================================================
# Beach View (Combined)
# ============================================================


@router.get("/view", response_model=BeachViewResponse)
async def get_beach_view(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BeachViewResponse:
    """Get combined beach view for mom or dad."""
    if not current_user.identity:
        raise HTTPException(
            status_code=400,
            detail="Please select identity first",
        )

    service = BeachService(db)
    result = await service.get_beach_view(current_user.id, current_user.identity)

    return BeachViewResponse(
        shells=[ShellResponse.model_validate(s) for s in result["shells"]],
        pending_bottles=result["pending_bottles"],
        pending_injections=result["pending_injections"],
        partner_nickname=result["partner_nickname"],
        partner_avatar_url=result["partner_avatar_url"],
    )
