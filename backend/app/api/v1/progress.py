"""Progress tracking REST API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.progress import UserProgress
from app.services.auth.dependencies import get_current_user_jwt_optional
from app.services.coach.models import CoachProgress
from app.services.coach.progress.tracker import create_progress_tracker
from app.services.community.models import User

router = APIRouter(prefix="/progress", tags=["progress"])

# Shared progress tracker instance (for anonymous users)
_progress_tracker = create_progress_tracker()


async def _get_db_progress(db: AsyncSession, user_id: str) -> CoachProgress | None:
    """Get progress from database for a user."""
    result = await db.execute(
        select(CoachProgress).where(CoachProgress.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def _save_db_progress(
    db: AsyncSession, user_id: str, progress: UserProgress
) -> None:
    """Save progress to database for a user."""
    db_progress = await _get_db_progress(db, user_id)
    if db_progress is None:
        db_progress = CoachProgress(user_id=user_id)
        db.add(db_progress)
    db_progress.set_progress(progress.model_dump(mode="json"))
    await db.commit()


@router.get("/{user_id}", response_model=UserProgress)
async def get_user_progress(user_id: str) -> UserProgress:
    """Get progress data for an anonymous user (legacy)."""
    return _progress_tracker.get_or_create_progress(user_id)


@router.get("/{user_id}/summary")
async def get_progress_summary(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_jwt_optional)],
) -> dict:
    """Get a summary of user progress for display."""
    # If authenticated and the user_id matches, try to load from database
    if current_user and current_user.id == user_id:
        db_progress = await _get_db_progress(db, user_id)
        if db_progress and db_progress.progress_data:
            progress_dict = db_progress.get_progress()
            if progress_dict:
                # Reconstruct UserProgress and get summary
                progress = UserProgress.model_validate(progress_dict)
                # Store in memory cache for session recording
                _progress_tracker._progress_cache[user_id] = progress
                return _progress_tracker.get_summary(user_id)

    return _progress_tracker.get_summary(user_id)


@router.get("/{user_id}/achievements")
async def get_user_achievements(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_jwt_optional)],
) -> list[dict]:
    """Get user's achievements."""
    # If authenticated and the user_id matches, try to load from database
    if current_user and current_user.id == user_id:
        db_progress = await _get_db_progress(db, user_id)
        if db_progress and db_progress.progress_data:
            progress_dict = db_progress.get_progress()
            if progress_dict:
                progress = UserProgress.model_validate(progress_dict)
                _progress_tracker._progress_cache[user_id] = progress
                return [
                    {
                        "id": a.id,
                        "name": a.name,
                        "description": a.description,
                        "icon": a.icon,
                        "is_earned": a.is_earned,
                        "earned_at": a.earned_at.isoformat() if a.earned_at else None,
                    }
                    for a in progress.achievements
                ]

    progress = _progress_tracker.get_or_create_progress(user_id)
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "is_earned": a.is_earned,
            "earned_at": a.earned_at.isoformat() if a.earned_at else None,
        }
        for a in progress.achievements
    ]


@router.post("/{user_id}/save")
async def save_user_progress(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_current_user_jwt_optional)],
) -> dict:
    """Save current progress to database (for authenticated users)."""
    if not current_user or current_user.id != user_id:
        return {"saved": False, "message": "未登录或用户ID不匹配"}

    progress = _progress_tracker.get_or_create_progress(user_id)
    await _save_db_progress(db, user_id, progress)
    return {"saved": True, "message": "进度已保存"}
