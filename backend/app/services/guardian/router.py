"""Guardian Partner API router."""

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth.dependencies import CurrentUserJWT

from .schemas import (
    AlbumResponse,
    BadgeResponse,
    BindingResponse,
    BindRequest,
    DailyStatusCreate,
    DailyStatusResponse,
    DailyTaskResponse,
    InviteResponse,
    MemoryCreate,
    MemoryResponse,
    ProgressResponse,
    StatusNotification,
    TaskCompleteRequest,
    TaskConfirmRequest,
)
from .service import GuardianService

router = APIRouter(prefix="/guardian", tags=["guardian"])


# ============================================================
# Partner Binding
# ============================================================


@router.post("/invite", response_model=InviteResponse)
async def create_invite(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InviteResponse:
    """Generate an invitation link for partner binding. (Mom only)"""
    service = GuardianService(db)
    try:
        result = await service.create_invite(current_user.id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/bind", response_model=BindingResponse)
async def accept_bind(
    request: BindRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BindingResponse:
    """Accept an invitation and bind as partner."""
    service = GuardianService(db)
    try:
        binding = await service.accept_invite(request.invite_code, current_user.id)
        await db.commit()
        return BindingResponse(
            id=binding.id,
            mom_id=binding.mom_id,
            partner_id=binding.partner_id,
            status=binding.status,
            created_at=binding.created_at,
            bound_at=binding.bound_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.delete("/unbind")
async def unbind(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Unbind partner relationship."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)
    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    try:
        await service.unbind(binding.id, current_user.id)
        await db.commit()
        return {"message": "解绑成功"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.get("/status")
async def get_binding_status(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Get current binding status with partner/mom info."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        return {
            "has_binding": False,
            "role": None,
            "binding": None,
            "partner_info": None,
            "mom_info": None,
        }

    # Determine if current user is mom or partner
    is_mom = binding.mom_id == current_user.id

    result: dict[str, Any] = {
        "has_binding": True,
        "role": "mom" if is_mom else "partner",
        "binding": BindingResponse(
            id=binding.id,
            mom_id=binding.mom_id,
            partner_id=binding.partner_id,
            status=binding.status,
            created_at=binding.created_at,
            bound_at=binding.bound_at,
        ),
        "partner_info": None,
        "mom_info": None,
    }

    if is_mom:
        result["partner_info"] = await service.get_partner_info(binding)
    else:
        result["mom_info"] = await service.get_mom_info(binding)

    return result


# ============================================================
# Daily Status (Mom records, Partner views)
# ============================================================


@router.post("/daily-status", response_model=DailyStatusResponse)
async def record_daily_status(
    data: DailyStatusCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DailyStatusResponse:
    """Record mom's daily status. (Mom only)"""
    service = GuardianService(db)
    status = await service.record_daily_status(current_user.id, data)
    await db.commit()

    return DailyStatusResponse(
        id=status.id,
        date=status.date,
        mood=status.mood,
        energy_level=status.energy_level,
        health_conditions=(
            __import__("json").loads(status.health_conditions)
            if status.health_conditions
            else []
        ),
        feeding_count=status.feeding_count,
        sleep_hours=status.sleep_hours,
        notes=status.notes,
        created_at=status.created_at,
        updated_at=status.updated_at,
    )


@router.get("/daily-status", response_model=StatusNotification | None)
async def get_daily_status(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: date | None = Query(  # noqa: B008
        None, description="Date to query (default: today)"
    ),
) -> StatusNotification | None:
    """Get mom's daily status with notification message. (Partner only)"""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    # Partner viewing mom's status
    if binding.partner_id == current_user.id:
        status = await service.get_daily_status(binding.mom_id, target_date)
        if not status:
            return None
        return service.generate_status_notification(status)

    # Mom viewing own status
    status = await service.get_daily_status(current_user.id, target_date)
    if not status:
        return None
    return service.generate_status_notification(status)


# ============================================================
# Tasks (Partner completes, Mom confirms)
# ============================================================


@router.get("/tasks", response_model=list[DailyTaskResponse])
async def get_daily_tasks(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DailyTaskResponse]:
    """Get today's tasks for partner."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    # Only partner should get tasks, but mom can also view
    tasks = await service.get_or_generate_daily_tasks(binding.id)
    await db.commit()  # Commit in case new tasks were generated
    return tasks


@router.post("/tasks/{task_id}/complete", response_model=DailyTaskResponse)
async def complete_task(
    task_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: TaskCompleteRequest | None = None,
) -> DailyTaskResponse:
    """Mark a task as completed. (Partner only)"""
    service = GuardianService(db)
    try:
        task = await service.complete_task(task_id, current_user.id)
        await db.commit()
        return service._task_to_response(task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/tasks/{task_id}/confirm")
async def confirm_task(
    task_id: str,
    request: TaskConfirmRequest,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Confirm task completion and award points. (Mom only)"""
    service = GuardianService(db)
    try:
        task, points = await service.confirm_task(
            task_id, current_user.id, request.feedback
        )
        await db.commit()
        return {
            "task": service._task_to_response(task),
            "points_awarded": points,
            "message": f"已奖励 {points} 积分",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


@router.post("/tasks/{task_id}/reject", response_model=DailyTaskResponse)
async def reject_task(
    task_id: str,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DailyTaskResponse:
    """Reject task - reset to available. (Mom only)"""
    service = GuardianService(db)
    try:
        task = await service.reject_task(task_id, current_user.id)
        await db.commit()
        return service._task_to_response(task)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None


# ============================================================
# Progress & Badges (Partner views)
# ============================================================


@router.get("/progress", response_model=ProgressResponse)
async def get_progress(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressResponse:
    """Get partner's progress and level info."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    return await service.get_progress(binding.id)


@router.get("/badges", response_model=list[BadgeResponse])
async def get_badges(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[BadgeResponse]:
    """Get partner's badges."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    return await service.get_badges(binding.id)


# ============================================================
# Memories (Time Recorder)
# ============================================================


@router.post("/memories", response_model=MemoryResponse)
async def add_memory(
    data: MemoryCreate,
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MemoryResponse:
    """Add a memory photo. (Partner only)"""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    # Only partner can add memories
    if binding.partner_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有伴侣可以添加时光记录")

    memory = await service.add_memory(binding.id, data)
    await db.commit()

    return MemoryResponse(
        id=memory.id,
        photo_url=memory.photo_url,
        caption=memory.caption,
        date=memory.date,
        milestone=memory.milestone,
        created_at=memory.created_at,
    )


@router.get("/memories", response_model=list[MemoryResponse])
async def get_memories(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(30, ge=1, le=100),  # noqa: B008
    offset: int = Query(0, ge=0),  # noqa: B008
) -> list[MemoryResponse]:
    """Get memories for the binding."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    return await service.get_memories(binding.id, limit, offset)


@router.get("/memories/album", response_model=AlbumResponse)
async def generate_album(
    current_user: CurrentUserJWT,
    db: Annotated[AsyncSession, Depends(get_db)],
    milestone: str | None = Query(  # noqa: B008
        None, description="Filter by milestone (e.g., '满月', '百天')"
    ),
) -> AlbumResponse:
    """Generate a memory album."""
    service = GuardianService(db)
    binding = await service.get_binding_for_user(current_user.id)

    if not binding:
        raise HTTPException(status_code=404, detail="未找到绑定关系")

    return await service.generate_album(binding.id, milestone)
