"""Exercise library REST API routes."""

from fastapi import APIRouter

from app.schemas.exercise import Exercise, ExerciseCategory, ExerciseSession
from app.services.rehab.exercises.library import (
    get_all_exercises,
    get_all_sessions,
    get_exercise,
    get_exercises_by_category,
    get_session,
)

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("/", response_model=list[Exercise])
async def list_exercises() -> list[Exercise]:
    """List all available exercises."""
    return get_all_exercises()


@router.get("/category/{category}", response_model=list[Exercise])
async def list_exercises_by_category(category: ExerciseCategory) -> list[Exercise]:
    """List exercises by category."""
    return get_exercises_by_category(category)


@router.get("/{exercise_id}", response_model=Exercise | None)
async def get_exercise_detail(exercise_id: str) -> Exercise | None:
    """Get details of a specific exercise."""
    return get_exercise(exercise_id)


@router.get("/sessions/", response_model=list[ExerciseSession])
async def list_sessions() -> list[ExerciseSession]:
    """List all available training sessions."""
    return get_all_sessions()


@router.get("/sessions/{session_id}", response_model=ExerciseSession | None)
async def get_session_detail(session_id: str) -> ExerciseSession | None:
    """Get details of a specific training session."""
    return get_session(session_id)
