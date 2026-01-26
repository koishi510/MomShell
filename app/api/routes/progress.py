"""Progress tracking REST API routes."""

from fastapi import APIRouter

from app.schemas.progress import UserProgress
from app.services.coach.progress.tracker import create_progress_tracker

router = APIRouter(prefix="/progress", tags=["progress"])

# Shared progress tracker instance
_progress_tracker = create_progress_tracker()


@router.get("/{user_id}", response_model=UserProgress)
async def get_user_progress(user_id: str) -> UserProgress:
    """Get progress data for a user."""
    return _progress_tracker.get_or_create_progress(user_id)


@router.get("/{user_id}/summary")
async def get_progress_summary(user_id: str) -> dict:
    """Get a summary of user progress for display."""
    return _progress_tracker.get_summary(user_id)


@router.get("/{user_id}/achievements")
async def get_user_achievements(user_id: str) -> list[dict]:
    """Get user's achievements."""
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
