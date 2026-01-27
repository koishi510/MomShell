"""User routes for community module."""

from fastapi import APIRouter, Query

from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
)
from ..schemas import (
    MyAnswerListItem,
    MyQuestionListItem,
    PaginatedResponse,
    UserProfile,
    UserProfileUpdate,
)

router = APIRouter(prefix="/users", tags=["Community - Users"])


@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> UserProfile:
    """Get current user's profile with statistics."""
    return await service.get_user_profile(db, current_user)


@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> UserProfile:
    """Update current user's profile (nickname/avatar)."""
    return await service.update_user_profile(db, current_user, profile_update)


@router.get("/me/questions", response_model=PaginatedResponse[MyQuestionListItem])
async def get_my_questions(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[MyQuestionListItem]:
    """Get questions created by current user."""
    return await service.get_user_questions(
        db=db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )


@router.get("/me/answers", response_model=PaginatedResponse[MyAnswerListItem])
async def get_my_answers(
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[MyAnswerListItem]:
    """Get answers created by current user."""
    return await service.get_user_answers(
        db=db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )
