"""Comment routes for community module."""

from fastapi import APIRouter

from ..dependencies import (
    CommunityServiceDep,
    CurrentUser,
    DbSession,
    OptionalUser,
)
from ..schemas import CommentCreate, CommentListItem

router = APIRouter(tags=["Community - Comments"])


@router.get("/answers/{answer_id}/comments", response_model=list[CommentListItem])
async def list_comments(
    answer_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: OptionalUser,
) -> list[CommentListItem]:
    """Get comments for an answer."""
    user_id = current_user.id if current_user else None
    return await service.get_comments(db, answer_id, user_id)


@router.post(
    "/answers/{answer_id}/comments",
    response_model=CommentListItem,
    status_code=201,
)
async def create_comment(
    answer_id: str,
    comment_in: CommentCreate,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> CommentListItem:
    """Create a new comment on an answer."""
    return await service.create_comment(db, answer_id, current_user, comment_in)


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    db: DbSession,
    service: CommunityServiceDep,
    current_user: CurrentUser,
) -> None:
    """Delete a comment (author or admin only)."""
    await service.delete_comment(db, comment_id, current_user)
